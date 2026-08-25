import { PaginatedResponse } from './responses';

// --- Enums / Constants ---

export type MovementType = 'receipt' | 'issue' | 'adjustment' | 'reversal';
export type StockDocumentType = 'receipt' | 'issue' | 'adjustment';
export type StockDocumentStatus = 'posted' | 'cancelled';
export type DocumentPrefix = 'RC' | 'IS' | 'AJ';

// Document number prefix per document type ({prefix}-{YYYYMMDD}-{NNNN})
export const STOCK_DOCUMENT_PREFIX: Record<StockDocumentType, DocumentPrefix> = {
  receipt: 'RC',
  issue: 'IS',
  adjustment: 'AJ',
};

// Default low-stock threshold for the balance list filter
export const LOW_STOCK_THRESHOLD_DEFAULT = 10;

// --- DTOs (input) ---

export interface StockItemInput {
  productId: string; // UUID
  quantity: number; // integer 1-999999 (always positive; sign comes from document type)
  unitCost?: number; // decimal <= 2 places, 0-999999999.99 (receipt only)
}

export interface AdjustmentItemInput {
  productId: string;
  countedQuantity: number; // integer 0-999999
  reason: string; // 1-500 chars
}

export interface CreateReceiptDto {
  documentDate?: string; // ISO 8601; omitted = current UTC time
  note?: string; // <= 1000 chars
  items: StockItemInput[]; // 1-100 items
}

export interface CreateIssueDto {
  documentDate?: string;
  note?: string;
  items: Omit<StockItemInput, 'unitCost'>[];
}

export interface CreateAdjustmentDto {
  documentDate?: string;
  note?: string;
  items: AdjustmentItemInput[];
}

export interface CancelDocumentDto {
  reason: string; // 1-500 chars
}

export interface StockBalanceQueryDto {
  page: number; // default 1
  limit: number; // default 20, max 100
  search?: string; // 1-200, partial match on name/sku
  categoryId?: string; // UUID
  lowStock?: boolean; // true = only balances <= threshold, ordered ascending
  threshold?: number; // 0-999999, default LOW_STOCK_THRESHOLD_DEFAULT
}

export interface StockMovementQueryDto {
  page: number;
  limit: number;
  productId?: string; // UUID; when provided = Stock Card mode (oldest -> newest)
  movementType?: MovementType;
  startDate?: string; // YYYY-MM-DD (inclusive)
  endDate?: string; // YYYY-MM-DD (inclusive)
}

// --- Responses (output, camelCase) ---

export interface StockMovementResponse {
  id: string;
  documentId: string;
  documentNumber: string;
  movementType: MovementType;
  productId: string;
  productName: string;
  sku: string;
  quantity: number; // signed
  balanceBefore: number;
  balanceAfter: number;
  difference: number; // = quantity (explicit meaning for adjustments)
  unitCost: number | null;
  reason: string | null;
  reversalOfMovementId: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface StockDocumentResponse {
  id: string;
  documentNumber: string;
  documentType: StockDocumentType;
  documentDate: Date;
  note: string | null;
  status: StockDocumentStatus;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  items: StockMovementResponse[];
}

export interface CancelDocumentResponse {
  document: StockDocumentResponse; // status = 'cancelled'
  reversals: StockMovementResponse[];
}

export interface StockBalanceResponse {
  productId: string;
  name: string;
  sku: string;
  category: string;
  categoryId: string | null;
  onHandBalance: number;
  unitPrice: number;
  stockValue: number; // onHandBalance * unitPrice rounded to 2 places
  status: 'active' | 'inactive';
  lastMovementAt: Date | null;
}

export interface StockBalanceDetailResponse extends StockBalanceResponse {
  recentMovements: StockMovementResponse[]; // latest 5
}

// --- Database Models (internal, snake_case) ---

export interface StockDocumentModel {
  id: string;
  document_number: string;
  document_type: StockDocumentType;
  document_date: Date;
  note: string | null;
  status: StockDocumentStatus;
  created_by: string;
  created_at: Date;
  cancelled_by: string | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
}

export interface StockMovementModel {
  id: string;
  seq: number;
  document_id: string;
  movement_type: MovementType;
  product_id: string;
  quantity: number;
  balance_before: number;
  balance_after: number;
  unit_cost: number | null;
  reason: string | null;
  reversal_of_movement_id: string | null;
  created_by: string;
  created_at: Date;
}

// --- Service Interface ---

export interface IStockService {
  createReceipt(data: CreateReceiptDto, userId: string): Promise<StockDocumentResponse>;
  createIssue(data: CreateIssueDto, userId: string): Promise<StockDocumentResponse>;
  createAdjustment(data: CreateAdjustmentDto, userId: string): Promise<StockDocumentResponse>;
  cancelDocument(documentId: string, data: CancelDocumentDto, userId: string): Promise<CancelDocumentResponse>;
  findDocumentById(documentId: string): Promise<StockDocumentResponse>;
  findBalances(query: StockBalanceQueryDto): Promise<PaginatedResponse<StockBalanceResponse>>;
  findBalanceByProductId(productId: string): Promise<StockBalanceDetailResponse>;
  findMovements(query: StockMovementQueryDto): Promise<PaginatedResponse<StockMovementResponse>>;
}
