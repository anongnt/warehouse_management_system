// --- Stock Management Types (mirrors backend/src/types/stock.types.ts) ---

export type MovementType = 'receipt' | 'issue' | 'adjustment' | 'reversal';
export type StockDocumentType = 'receipt' | 'issue' | 'adjustment';
export type StockDocumentStatus = 'posted' | 'cancelled';

export const LOW_STOCK_THRESHOLD_DEFAULT = 10;

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receipt: 'รับเข้า',
  issue: 'จ่ายออก',
  adjustment: 'ปรับยอด',
  reversal: 'หักกลบ',
};

export const DOCUMENT_TYPE_LABELS: Record<StockDocumentType, string> = {
  receipt: 'รับสินค้าเข้า',
  issue: 'จ่ายสินค้าออก',
  adjustment: 'ปรับยอดสต็อก',
};

// --- Responses ---

export interface StockMovement {
  id: string;
  documentId: string;
  documentNumber: string;
  movementType: MovementType;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  difference: number;
  unitCost: number | null;
  reason: string | null;
  reversalOfMovementId: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface StockDocument {
  id: string;
  documentNumber: string;
  documentType: StockDocumentType;
  documentDate: string;
  note: string | null;
  status: StockDocumentStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: StockMovement[];
}

export interface CancelDocumentResult {
  document: StockDocument;
  reversals: StockMovement[];
}

export interface StockBalance {
  productId: string;
  name: string;
  sku: string;
  category: string;
  categoryId: string | null;
  onHandBalance: number;
  unitPrice: number;
  stockValue: number;
  status: 'active' | 'inactive';
  lastMovementAt: string | null;
}

export interface StockBalanceDetail extends StockBalance {
  recentMovements: StockMovement[];
}

// --- Form payloads ---

export interface StockItemPayload {
  productId: string;
  quantity: number;
  unitCost?: number;
}

export interface AdjustmentItemPayload {
  productId: string;
  countedQuantity: number;
  reason: string;
}

export interface CreateReceiptPayload {
  documentDate?: string;
  note?: string;
  items: StockItemPayload[];
}

export interface CreateIssuePayload {
  documentDate?: string;
  note?: string;
  items: Omit<StockItemPayload, 'unitCost'>[];
}

export interface CreateAdjustmentPayload {
  documentDate?: string;
  note?: string;
  items: AdjustmentItemPayload[];
}

export interface CancelDocumentPayload {
  reason: string;
}

// --- Query params ---

export interface StockBalanceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  threshold?: number;
}

export interface StockMovementQueryParams {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: MovementType;
  startDate?: string;
  endDate?: string;
}

// --- Paginated shapes ---

export interface PaginatedStockBalanceResponse {
  data: StockBalance[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedStockMovementResponse {
  data: StockMovement[];
  total: number;
  page: number;
  totalPages: number;
}
