import type { ConnectionPool, Transaction, Request as SqlRequest } from 'mssql';
import { getPool, sql } from '../database';
import {
  IStockService,
  CreateReceiptDto,
  CreateIssueDto,
  CreateAdjustmentDto,
  CancelDocumentDto,
  StockBalanceQueryDto,
  StockMovementQueryDto,
  StockDocumentResponse,
  CancelDocumentResponse,
  StockBalanceResponse,
  StockBalanceDetailResponse,
  StockMovementResponse,
  StockDocumentModel,
  StockMovementModel,
  StockDocumentType,
  PaginatedResponse,
  STOCK_DOCUMENT_PREFIX,
  LOW_STOCK_THRESHOLD_DEFAULT,
} from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';
import {
  LedgerLine,
  LedgerProductSnapshot,
  MAX_RUNNING_NUMBER,
  buildAdjustmentLines,
  buildIssueLines,
  buildReceiptLines,
  buildReversalLines,
  formatDocumentNumber,
  normalizeAdjustmentItems,
  normalizeId,
  normalizeQuantityItems,
} from './stock-ledger';

// SQL error numbers we retry on
const SQL_UNIQUE_VIOLATION = [2627, 2601];
const SQL_DEADLOCK_VICTIM = 1205;
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [50, 100, 200];

type Executor = Transaction | ConnectionPool;

// Row shape of the movement query (movement joined with document / product / user)
interface MovementJoinRow {
  id: string;
  document_id: string;
  document_number: string;
  movement_type: StockMovementModel['movement_type'];
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  balance_before: number;
  balance_after: number;
  unit_cost: number | null;
  reason: string | null;
  reversal_of_movement_id: string | null;
  created_by: string;
  created_by_name: string;
  created_at: Date;
  seq: number;
}

// Row shape of the balance query
interface BalanceRow {
  product_id: string;
  name: string;
  sku: string;
  category: string;
  category_id: string | null;
  on_hand_balance: number;
  unit_price: number;
  stock_value: number;
  status: 'active' | 'inactive';
  last_movement_at: Date | null;
}

const MOVEMENT_SELECT = `
  SELECT m.id, m.document_id, d.document_number, m.movement_type, m.product_id,
         p.name AS product_name, p.sku, m.quantity, m.balance_before, m.balance_after,
         m.unit_cost, m.reason, m.reversal_of_movement_id, m.created_by,
         u.first_name + ' ' + u.last_name AS created_by_name, m.created_at, m.seq
  FROM stock_movements m
  INNER JOIN stock_documents d ON d.id = m.document_id
  INNER JOIN products p ON p.id = m.product_id
  INNER JOIN users u ON u.id = m.created_by`;

const BALANCE_SELECT = `
  SELECT p.id AS product_id, p.name, p.sku, p.category, p.category_id,
         p.quantity AS on_hand_balance, p.unit_price,
         ROUND(CAST(p.quantity AS DECIMAL(18,2)) * p.unit_price, 2) AS stock_value,
         p.status,
         (SELECT MAX(m.created_at) FROM stock_movements m WHERE m.product_id = p.id) AS last_movement_at
  FROM products p`;

export class StockService implements IStockService {
  // ------------------------------------------------------------------
  // Transaction / retry / locking helpers
  // This is the first feature in the codebase that uses sql.Transaction;
  // every write path below goes through these three helpers.
  // ------------------------------------------------------------------

  private async withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      try {
        await tx.rollback();
      } catch {
        /* transaction was already aborted - keep the original error */
      }
      throw error;
    }
  }

  // Retry on unique violation (document number collision) and deadlock victim
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const number = this.sqlErrorNumber(error);
        const isRetryable =
          number !== null && (SQL_UNIQUE_VIOLATION.includes(number) || number === SQL_DEADLOCK_VICTIM);

        if (!isRetryable) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS[attempt - 1]));
        }
      }
    }

    const number = this.sqlErrorNumber(lastError);
    if (number === SQL_DEADLOCK_VICTIM) {
      throw new ConflictError('ระบบมีการทำงานพร้อมกันจำนวนมาก กรุณาลองใหม่อีกครั้ง');
    }
    throw new ConflictError('สร้างเลขที่เอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }

  // Extract the SQL Server error number from an mssql error (may be nested)
  private sqlErrorNumber(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const candidate = error as {
      number?: number;
      originalError?: { info?: { number?: number }; number?: number };
    };

    if (typeof candidate.number === 'number') {
      return candidate.number;
    }
    if (typeof candidate.originalError?.number === 'number') {
      return candidate.originalError.number;
    }
    if (typeof candidate.originalError?.info?.number === 'number') {
      return candidate.originalError.info.number;
    }

    return null;
  }

  private request(executor: Executor): SqlRequest {
    return new sql.Request(executor as Transaction);
  }

  // Lock product rows one by one, ordered by product id ascending, to avoid
  // circular deadlocks between concurrent requests (UPDLOCK is held until commit).
  private async lockProducts(
    tx: Transaction,
    productIds: string[]
  ): Promise<Map<string, LedgerProductSnapshot>> {
    const uniqueIds = Array.from(new Set(productIds.map((id) => normalizeId(id)))).sort();
    const snapshots = new Map<string, LedgerProductSnapshot>();

    for (const productId of uniqueIds) {
      const result = await this.request(tx)
        .input('id', sql.UniqueIdentifier, productId)
        .query<{ id: string; sku: string; status: 'active' | 'inactive'; quantity: number }>(
          `SELECT id, sku, status, quantity FROM products WITH (UPDLOCK, ROWLOCK) WHERE id = @id`
        );

      if (result.recordset.length > 0) {
        const row = result.recordset[0];
        snapshots.set(normalizeId(row.id), {
          id: row.id,
          sku: row.sku,
          status: row.status,
          quantity: row.quantity,
        });
      }
    }

    return snapshots;
  }

  // ------------------------------------------------------------------
  // Document number generation
  // ------------------------------------------------------------------

  private async nextDocumentNumber(
    tx: Transaction,
    type: StockDocumentType,
    date: Date
  ): Promise<string> {
    const prefix = STOCK_DOCUMENT_PREFIX[type];
    // 'RC-20260101-0001' -> 'RC-20260101-'
    const pattern = `${formatDocumentNumber(prefix, date, 1).slice(0, -4)}%`;

    const result = await this.request(tx)
      .input('pattern', sql.NVarChar, pattern)
      .query<{ maxRunning: number | null }>(
        `SELECT MAX(CAST(RIGHT(document_number, 4) AS INT)) AS maxRunning
         FROM stock_documents WITH (UPDLOCK, HOLDLOCK)
         WHERE document_number LIKE @pattern`
      );

    const maxRunning = result.recordset[0]?.maxRunning ?? 0;
    const next = (maxRunning || 0) + 1;

    if (next > MAX_RUNNING_NUMBER) {
      throw new ConflictError('จำนวนเอกสารของวันนี้ถึงขีดจำกัดแล้ว (9,999 ฉบับ)');
    }

    return formatDocumentNumber(prefix, date, next);
  }

  // ------------------------------------------------------------------
  // Write helpers
  // ------------------------------------------------------------------

  private async insertDocument(
    tx: Transaction,
    documentNumber: string,
    documentType: StockDocumentType,
    documentDate: Date,
    note: string | null,
    userId: string
  ): Promise<string> {
    const result = await this.request(tx)
      .input('document_number', sql.NVarChar, documentNumber)
      .input('document_type', sql.NVarChar, documentType)
      .input('document_date', sql.DateTime2, documentDate)
      .input('note', sql.NVarChar, note)
      .input('created_by', sql.UniqueIdentifier, userId)
      .query<{ id: string }>(
        `INSERT INTO stock_documents (document_number, document_type, document_date, note, status, created_by, created_at)
         OUTPUT INSERTED.id
         VALUES (@document_number, @document_type, @document_date, @note, 'posted', @created_by, GETUTCDATE())`
      );

    return result.recordset[0].id;
  }

  private async insertMovements(
    tx: Transaction,
    documentId: string,
    lines: LedgerLine[],
    userId: string
  ): Promise<string[]> {
    const ids: string[] = [];

    // Inserted one by one so that `seq` follows the ledger line order exactly
    for (const line of lines) {
      const result = await this.request(tx)
        .input('document_id', sql.UniqueIdentifier, documentId)
        .input('movement_type', sql.NVarChar, line.movementType)
        .input('product_id', sql.UniqueIdentifier, line.productId)
        .input('quantity', sql.Int, line.quantity)
        .input('balance_before', sql.Int, line.balanceBefore)
        .input('balance_after', sql.Int, line.balanceAfter)
        .input('unit_cost', sql.Decimal(12, 2), line.unitCost)
        .input('reason', sql.NVarChar, line.reason)
        .input('reversal_of_movement_id', sql.UniqueIdentifier, line.reversalOfMovementId)
        .input('created_by', sql.UniqueIdentifier, userId)
        .query<{ id: string }>(
          `INSERT INTO stock_movements (document_id, movement_type, product_id, quantity, balance_before,
                                        balance_after, unit_cost, reason, reversal_of_movement_id, created_by, created_at)
           OUTPUT INSERTED.id
           VALUES (@document_id, @movement_type, @product_id, @quantity, @balance_before,
                   @balance_after, @unit_cost, @reason, @reversal_of_movement_id, @created_by, GETUTCDATE())`
        );

      ids.push(result.recordset[0].id);
    }

    return ids;
  }

  // Write the cached balance: the balance_after of the last line of each product
  private async applyBalances(tx: Transaction, lines: LedgerLine[]): Promise<void> {
    const finalBalances = new Map<string, { productId: string; balance: number }>();

    for (const line of lines) {
      finalBalances.set(normalizeId(line.productId), {
        productId: line.productId,
        balance: line.balanceAfter,
      });
    }

    for (const entry of finalBalances.values()) {
      await this.request(tx)
        .input('id', sql.UniqueIdentifier, entry.productId)
        .input('quantity', sql.Int, entry.balance)
        .query(`UPDATE products SET quantity = @quantity, updated_at = GETUTCDATE() WHERE id = @id`);
    }
  }

  // ------------------------------------------------------------------
  // Read helpers
  // ------------------------------------------------------------------

  private async loadDocumentResponse(
    executor: Executor,
    documentId: string
  ): Promise<StockDocumentResponse> {
    const headerResult = await this.request(executor)
      .input('id', sql.UniqueIdentifier, documentId)
      .query<StockDocumentModel & { created_by_name: string; cancelled_by_name: string | null }>(
        `SELECT d.id, d.document_number, d.document_type, d.document_date, d.note, d.status,
                d.created_by, d.created_at, d.cancelled_by, d.cancelled_at, d.cancel_reason,
                cu.first_name + ' ' + cu.last_name AS created_by_name,
                CASE WHEN xu.id IS NULL THEN NULL ELSE xu.first_name + ' ' + xu.last_name END AS cancelled_by_name
         FROM stock_documents d
         INNER JOIN users cu ON cu.id = d.created_by
         LEFT JOIN users xu ON xu.id = d.cancelled_by
         WHERE d.id = @id`
      );

    if (headerResult.recordset.length === 0) {
      throw new NotFoundError('ไม่พบเอกสาร');
    }

    const header = headerResult.recordset[0];

    const itemsResult = await this.request(executor)
      .input('documentId', sql.UniqueIdentifier, documentId)
      .query<MovementJoinRow>(`${MOVEMENT_SELECT} WHERE m.document_id = @documentId ORDER BY m.seq ASC`);

    return {
      id: header.id,
      documentNumber: header.document_number,
      documentType: header.document_type,
      documentDate: header.document_date,
      note: header.note,
      status: header.status,
      createdBy: header.created_by,
      createdByName: header.created_by_name,
      createdAt: header.created_at,
      cancelledBy: header.cancelled_by,
      cancelledByName: header.cancelled_by_name,
      cancelledAt: header.cancelled_at,
      cancelReason: header.cancel_reason,
      items: itemsResult.recordset.map((row) => this.toMovementResponse(row)),
    };
  }

  private toMovementResponse(row: MovementJoinRow): StockMovementResponse {
    return {
      id: row.id,
      documentId: row.document_id,
      documentNumber: row.document_number,
      movementType: row.movement_type,
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      quantity: row.quantity,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      difference: row.quantity,
      unitCost: row.unit_cost === null || row.unit_cost === undefined ? null : Number(row.unit_cost),
      reason: row.reason,
      reversalOfMovementId: row.reversal_of_movement_id,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    };
  }

  private toBalanceResponse(row: BalanceRow): StockBalanceResponse {
    return {
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      categoryId: row.category_id,
      onHandBalance: row.on_hand_balance,
      unitPrice: Number(row.unit_price),
      stockValue: Number(row.stock_value),
      status: row.status,
      lastMovementAt: row.last_movement_at,
    };
  }

  private resolveDocumentDate(documentDate?: string): Date {
    if (!documentDate) {
      return new Date();
    }
    const parsed = new Date(documentDate);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  async createReceipt(data: CreateReceiptDto, userId: string): Promise<StockDocumentResponse> {
    const items = normalizeQuantityItems(data.items);
    const documentDate = this.resolveDocumentDate(data.documentDate);

    return this.withRetry(() =>
      this.withTransaction(async (tx) => {
        const snapshots = await this.lockProducts(
          tx,
          items.map((item) => item.productId)
        );
        const lines = buildReceiptLines(snapshots, items);

        const documentNumber = await this.nextDocumentNumber(tx, 'receipt', documentDate);
        const documentId = await this.insertDocument(
          tx,
          documentNumber,
          'receipt',
          documentDate,
          data.note ?? null,
          userId
        );

        await this.insertMovements(tx, documentId, lines, userId);
        await this.applyBalances(tx, lines);

        return this.loadDocumentResponse(tx, documentId);
      })
    );
  }

  async createIssue(data: CreateIssueDto, userId: string): Promise<StockDocumentResponse> {
    const items = normalizeQuantityItems(data.items);
    const documentDate = this.resolveDocumentDate(data.documentDate);

    return this.withRetry(() =>
      this.withTransaction(async (tx) => {
        const snapshots = await this.lockProducts(
          tx,
          items.map((item) => item.productId)
        );
        const lines = buildIssueLines(snapshots, items);

        const documentNumber = await this.nextDocumentNumber(tx, 'issue', documentDate);
        const documentId = await this.insertDocument(
          tx,
          documentNumber,
          'issue',
          documentDate,
          data.note ?? null,
          userId
        );

        await this.insertMovements(tx, documentId, lines, userId);
        await this.applyBalances(tx, lines);

        return this.loadDocumentResponse(tx, documentId);
      })
    );
  }

  async createAdjustment(data: CreateAdjustmentDto, userId: string): Promise<StockDocumentResponse> {
    const items = normalizeAdjustmentItems(data.items);
    const documentDate = this.resolveDocumentDate(data.documentDate);

    return this.withRetry(() =>
      this.withTransaction(async (tx) => {
        const snapshots = await this.lockProducts(
          tx,
          items.map((item) => item.productId)
        );
        const lines = buildAdjustmentLines(snapshots, items);

        const documentNumber = await this.nextDocumentNumber(tx, 'adjustment', documentDate);
        const documentId = await this.insertDocument(
          tx,
          documentNumber,
          'adjustment',
          documentDate,
          data.note ?? null,
          userId
        );

        await this.insertMovements(tx, documentId, lines, userId);
        await this.applyBalances(tx, lines);

        return this.loadDocumentResponse(tx, documentId);
      })
    );
  }

  async cancelDocument(
    documentId: string,
    data: CancelDocumentDto,
    userId: string
  ): Promise<CancelDocumentResponse> {
    return this.withRetry(() =>
      this.withTransaction(async (tx) => {
        // Lock the document header so two cancels cannot interleave
        const documentResult = await this.request(tx)
          .input('id', sql.UniqueIdentifier, documentId)
          .query<{ id: string; status: StockDocumentModel['status'] }>(
            `SELECT id, status FROM stock_documents WITH (UPDLOCK, ROWLOCK) WHERE id = @id`
          );

        if (documentResult.recordset.length === 0) {
          throw new NotFoundError('ไม่พบเอกสาร');
        }
        if (documentResult.recordset[0].status === 'cancelled') {
          throw new ConflictError('เอกสารนี้ถูกยกเลิกแล้ว');
        }

        // Original movements are never deleted or edited - only reversed
        const originalsResult = await this.request(tx)
          .input('documentId', sql.UniqueIdentifier, documentId)
          .query<StockMovementModel>(
            `SELECT id, seq, document_id, movement_type, product_id, quantity, balance_before,
                    balance_after, unit_cost, reason, reversal_of_movement_id, created_by, created_at
             FROM stock_movements
             WHERE document_id = @documentId AND movement_type <> 'reversal'
             ORDER BY seq ASC`
          );

        const originals = originalsResult.recordset;

        const snapshots = await this.lockProducts(
          tx,
          originals.map((movement) => movement.product_id)
        );
        const lines = buildReversalLines(snapshots, originals);

        const reversalIds = await this.insertMovements(tx, documentId, lines, userId);

        await this.request(tx)
          .input('id', sql.UniqueIdentifier, documentId)
          .input('cancelled_by', sql.UniqueIdentifier, userId)
          .input('cancel_reason', sql.NVarChar, data.reason)
          .query(
            `UPDATE stock_documents
             SET status = 'cancelled', cancelled_by = @cancelled_by,
                 cancelled_at = GETUTCDATE(), cancel_reason = @cancel_reason
             WHERE id = @id`
          );

        await this.applyBalances(tx, lines);

        const document = await this.loadDocumentResponse(tx, documentId);
        const reversalIdSet = new Set(reversalIds.map((id) => normalizeId(id)));

        return {
          document,
          reversals: document.items.filter((item) => reversalIdSet.has(normalizeId(item.id))),
        };
      })
    );
  }

  async findDocumentById(documentId: string): Promise<StockDocumentResponse> {
    const pool = await getPool();
    return this.loadDocumentResponse(pool, documentId);
  }

  async findBalances(query: StockBalanceQueryDto): Promise<PaginatedResponse<StockBalanceResponse>> {
    const pool = await getPool();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const search = query.search && query.search.trim() ? `%${query.search.trim()}%` : null;
    const categoryId = query.categoryId || null;
    const lowStock = query.lowStock === true;
    const threshold =
      query.threshold !== undefined && query.threshold !== null
        ? query.threshold
        : LOW_STOCK_THRESHOLD_DEFAULT;

    const whereClause = `
      WHERE (@search IS NULL OR p.name LIKE @search OR p.sku LIKE @search)
        AND (@categoryId IS NULL OR p.category_id = @categoryId)
        AND (@lowStock = 0 OR p.quantity <= @threshold)`;

    const bindFilters = (request: SqlRequest): SqlRequest =>
      request
        .input('search', sql.NVarChar, search)
        .input('categoryId', sql.UniqueIdentifier, categoryId)
        .input('lowStock', sql.Bit, lowStock ? 1 : 0)
        .input('threshold', sql.Int, threshold);

    const countResult = await bindFilters(this.request(pool)).query<{ total: number }>(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    // Low-stock mode surfaces the most urgent items first
    const orderBy = lowStock ? 'p.quantity ASC, p.name ASC' : 'p.name ASC';

    const dataResult = await bindFilters(this.request(pool))
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query<BalanceRow>(
        `${BALANCE_SELECT}
         ${whereClause}
         ORDER BY ${orderBy}
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      );

    return {
      data: dataResult.recordset.map((row) => this.toBalanceResponse(row)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findBalanceByProductId(productId: string): Promise<StockBalanceDetailResponse> {
    const pool = await getPool();

    const balanceResult = await this.request(pool)
      .input('productId', sql.UniqueIdentifier, productId)
      .query<BalanceRow>(`${BALANCE_SELECT} WHERE p.id = @productId`);

    if (balanceResult.recordset.length === 0) {
      throw new NotFoundError('ไม่พบสินค้า');
    }

    const movementsResult = await this.request(pool)
      .input('productId', sql.UniqueIdentifier, productId)
      .query<MovementJoinRow>(
        `${MOVEMENT_SELECT.replace('SELECT m.id', 'SELECT TOP 5 m.id')}
         WHERE m.product_id = @productId
         ORDER BY m.seq DESC`
      );

    return {
      ...this.toBalanceResponse(balanceResult.recordset[0]),
      recentMovements: movementsResult.recordset.map((row) => this.toMovementResponse(row)),
    };
  }

  async findMovements(
    query: StockMovementQueryDto
  ): Promise<PaginatedResponse<StockMovementResponse>> {
    const pool = await getPool();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const productId = query.productId || null;
    const movementType = query.movementType || null;
    const startDate = query.startDate || null;
    const endDate = query.endDate || null;

    const whereClause = `
      WHERE (@productId IS NULL OR m.product_id = @productId)
        AND (@movementType IS NULL OR m.movement_type = @movementType)
        AND (@startDate IS NULL OR d.document_date >= @startDate)
        AND (@endDate IS NULL OR d.document_date < DATEADD(day, 1, @endDate))`;

    const bindFilters = (request: SqlRequest): SqlRequest =>
      request
        .input('productId', sql.UniqueIdentifier, productId)
        .input('movementType', sql.NVarChar, movementType)
        .input('startDate', sql.Date, startDate)
        .input('endDate', sql.Date, endDate);

    const countResult = await bindFilters(this.request(pool)).query<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM stock_movements m
       INNER JOIN stock_documents d ON d.id = m.document_id
       ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    // Stock Card mode (single product) reads oldest -> newest so the balance chain is readable
    const orderBy = productId ? 'm.seq ASC' : 'm.created_at DESC, m.seq DESC';

    const dataResult = await bindFilters(this.request(pool))
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query<MovementJoinRow>(
        `${MOVEMENT_SELECT}
         ${whereClause}
         ORDER BY ${orderBy}
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      );

    return {
      data: dataResult.recordset.map((row) => this.toMovementResponse(row)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
