import {
  MovementType,
  StockItemInput,
  AdjustmentItemInput,
  StockMovementModel,
  DocumentPrefix,
} from '../types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

// Maximum on-hand balance supported by products.quantity CHECK constraint
export const MAX_BALANCE = 999999;

// Maximum running number of a document number ({prefix}-{YYYYMMDD}-{NNNN})
export const MAX_RUNNING_NUMBER = 9999;

// Snapshot of a product row that has already been locked inside a transaction
export interface LedgerProductSnapshot {
  id: string;
  sku: string;
  status: 'active' | 'inactive';
  quantity: number; // current On_Hand_Balance
}

// One ledger line to be inserted into stock_movements
export interface LedgerLine {
  productId: string;
  movementType: MovementType;
  quantity: number; // signed: receipt > 0, issue < 0, adjustment/reversal = difference
  balanceBefore: number;
  balanceAfter: number;
  unitCost: number | null;
  reason: string | null;
  reversalOfMovementId: string | null;
}

// UUIDs are compared and keyed in lowercase so that snapshots coming back from
// SQL Server (uppercase) always match ids supplied by the client (any case).
export function normalizeId(id: string): string {
  return String(id).trim().toLowerCase();
}

function requireSnapshot(
  snapshots: Map<string, LedgerProductSnapshot>,
  productId: string
): LedgerProductSnapshot {
  const snapshot = snapshots.get(normalizeId(productId));
  if (!snapshot) {
    throw new NotFoundError(`ไม่พบสินค้า: ${productId}`);
  }
  return snapshot;
}

// Merge duplicate productId into a single item (summing quantity) and sort by productId ascending
export function normalizeQuantityItems(items: StockItemInput[]): StockItemInput[] {
  const merged = new Map<string, StockItemInput>();

  for (const item of items) {
    const key = normalizeId(item.productId);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      // A later unitCost overrides an earlier one; undefined does not clear it
      if (item.unitCost !== undefined && item.unitCost !== null) {
        existing.unitCost = item.unitCost;
      }
    } else {
      merged.set(key, {
        productId: key,
        quantity: item.quantity,
        ...(item.unitCost !== undefined && item.unitCost !== null ? { unitCost: item.unitCost } : {}),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
}

// Duplicate productId in an adjustment: the last entry wins (it is the real counted quantity)
export function normalizeAdjustmentItems(items: AdjustmentItemInput[]): AdjustmentItemInput[] {
  const merged = new Map<string, AdjustmentItemInput>();

  for (const item of items) {
    const key = normalizeId(item.productId);
    merged.set(key, {
      productId: key,
      countedQuantity: item.countedQuantity,
      reason: item.reason,
    });
  }

  return Array.from(merged.values()).sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
}

// Receipt: quantity is positive, balance must not exceed MAX_BALANCE
export function buildReceiptLines(
  snapshots: Map<string, LedgerProductSnapshot>,
  items: StockItemInput[]
): LedgerLine[] {
  return items.map((item) => {
    const snapshot = requireSnapshot(snapshots, item.productId);

    if (snapshot.status !== 'active') {
      throw new ValidationError(`สินค้า ${snapshot.sku} ไม่อยู่ในสถานะที่รับเข้าได้`);
    }

    const balanceBefore = snapshot.quantity;
    const balanceAfter = balanceBefore + item.quantity;

    if (balanceAfter > MAX_BALANCE) {
      throw new ValidationError(
        `ยอดคงเหลือของสินค้า ${snapshot.sku} จะเกินค่าสูงสุดที่ระบบรองรับ (999,999)`
      );
    }

    return {
      productId: snapshot.id,
      movementType: 'receipt' as MovementType,
      quantity: item.quantity,
      balanceBefore,
      balanceAfter,
      unitCost: item.unitCost !== undefined && item.unitCost !== null ? item.unitCost : null,
      reason: null,
      reversalOfMovementId: null,
    };
  });
}

// Issue: quantity is negative, balance must stay >= 0
export function buildIssueLines(
  snapshots: Map<string, LedgerProductSnapshot>,
  items: StockItemInput[]
): LedgerLine[] {
  return items.map((item) => {
    const snapshot = requireSnapshot(snapshots, item.productId);

    if (snapshot.status !== 'active') {
      throw new ValidationError(`สินค้า ${snapshot.sku} ไม่อยู่ในสถานะที่จ่ายออกได้`);
    }

    const balanceBefore = snapshot.quantity;

    if (item.quantity > balanceBefore) {
      throw new ValidationError(
        `สินค้า ${snapshot.sku} มีคงเหลือ ${balanceBefore} ชิ้น ไม่เพียงพอกับจำนวนที่ขอจ่ายออก ${item.quantity} ชิ้น`
      );
    }

    return {
      productId: snapshot.id,
      movementType: 'issue' as MovementType,
      quantity: -item.quantity,
      balanceBefore,
      balanceAfter: balanceBefore - item.quantity,
      unitCost: null,
      reason: null,
      reversalOfMovementId: null,
    };
  });
}

// Adjustment: balanceAfter is set to the counted quantity, quantity is the difference (may be 0)
export function buildAdjustmentLines(
  snapshots: Map<string, LedgerProductSnapshot>,
  items: AdjustmentItemInput[]
): LedgerLine[] {
  return items.map((item) => {
    const snapshot = requireSnapshot(snapshots, item.productId);

    const balanceBefore = snapshot.quantity;
    const balanceAfter = item.countedQuantity;

    if (balanceAfter < 0 || balanceAfter > MAX_BALANCE) {
      throw new ValidationError(
        `จำนวนที่นับได้ของสินค้า ${snapshot.sku} ต้องอยู่ระหว่าง 0-999,999`
      );
    }

    return {
      productId: snapshot.id,
      movementType: 'adjustment' as MovementType,
      quantity: balanceAfter - balanceBefore,
      balanceBefore,
      balanceAfter,
      unitCost: null,
      reason: item.reason,
      reversalOfMovementId: null,
    };
  });
}

// Reversal: one line per original movement, quantity is the exact opposite of the original
export function buildReversalLines(
  snapshots: Map<string, LedgerProductSnapshot>,
  originals: StockMovementModel[]
): LedgerLine[] {
  // Running balance per product so multiple lines of the same product chain correctly
  const running = new Map<string, number>();
  const lines: LedgerLine[] = [];

  for (const original of originals) {
    const snapshot = requireSnapshot(snapshots, original.product_id);
    const key = normalizeId(original.product_id);

    const balanceBefore = running.has(key) ? (running.get(key) as number) : snapshot.quantity;
    const quantity = -original.quantity;
    const balanceAfter = balanceBefore + quantity;

    if (balanceAfter < 0) {
      throw new ConflictError(
        `ไม่สามารถยกเลิกเอกสารได้ เนื่องจากสินค้า ${snapshot.sku} มีคงเหลือ ${balanceBefore} ชิ้น น้อยกว่าจำนวนที่ต้องหักกลบ`
      );
    }
    if (balanceAfter > MAX_BALANCE) {
      throw new ConflictError(
        `ไม่สามารถยกเลิกเอกสารได้ เนื่องจากยอดคงเหลือของสินค้า ${snapshot.sku} จะเกินค่าสูงสุดที่ระบบรองรับ (999,999)`
      );
    }

    running.set(key, balanceAfter);

    lines.push({
      productId: snapshot.id,
      movementType: 'reversal',
      quantity,
      balanceBefore,
      balanceAfter,
      unitCost: original.unit_cost !== null && original.unit_cost !== undefined ? Number(original.unit_cost) : null,
      reason: null,
      reversalOfMovementId: original.id,
    });
  }

  return lines;
}

// {prefix}-{YYYYMMDD in UTC}-{NNNN}
export function formatDocumentNumber(prefix: DocumentPrefix, date: Date, running: number): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const runningPart = String(running).padStart(4, '0');

  return `${prefix}-${year}${month}${day}-${runningPart}`;
}

const DOCUMENT_NUMBER_REGEX = /^(RC|IS|AJ)-(\d{8})-(\d{4})$/;

export function parseDocumentNumber(
  documentNumber: string
): { prefix: DocumentPrefix; datePart: string; running: number } | null {
  const match = DOCUMENT_NUMBER_REGEX.exec(documentNumber);
  if (!match) {
    return null;
  }

  return {
    prefix: match[1] as DocumentPrefix,
    datePart: match[2],
    running: parseInt(match[3], 10),
  };
}
