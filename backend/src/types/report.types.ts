// Report Types & Interfaces

export type ReportType = 'inventory' | 'category' | 'low-stock' | 'stock-value';
export type ReportFormat = 'pdf' | 'xlsx';

// Filters passed to report queries
export interface ReportFilters {
  category?: string;
  status?: 'active' | 'inactive';
}

// Options for generating a report
export interface ReportOptions {
  type: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  threshold?: number; // for low-stock report
}

// Result from report generation
export interface ReportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

// Common product row in reports
export interface ReportProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status: 'active' | 'inactive';
}

// Inventory report data
export interface InventoryReportData {
  title: string;
  generatedAt: string; // UTC YYYY-MM-DD HH:mm
  totalCount: number;
  products: ReportProductRow[];
}

// Category group within category report
export interface CategoryGroup {
  categoryName: string;
  productCount: number;
  totalStockValue: number;
  products: ReportProductRow[];
}

// Category report data
export interface CategoryReportData {
  title: string;
  generatedAt: string;
  totalCount: number;
  categories: CategoryGroup[];
}

// Low stock report data
export interface LowStockReportData {
  title: string;
  generatedAt: string;
  totalCount: number;
  threshold: number;
  products: ReportProductRow[];
}

// Stock value product row (extends with stockValue)
export interface StockValueProductRow extends ReportProductRow {
  stockValue: number; // quantity * unitPrice
}

// Stock value report data
export interface StockValueReportData {
  title: string;
  generatedAt: string;
  totalCount: number;
  totalProducts: number;
  totalQuantity: number;
  totalStockValue: number;
  products: StockValueProductRow[];
}
