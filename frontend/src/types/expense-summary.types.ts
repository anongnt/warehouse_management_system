// Expense Summary Report Types - Frontend

// ตัวกรองสำหรับ query ข้อมูลค่าใช้จ่าย
export interface ExpenseSummaryFilters {
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  categories?: string[];      // category IDs
}

// รายการค่าใช้จ่ายแต่ละรายการ
export interface ExpenseItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;          // ทศนิยม 2 ตำแหน่ง
  totalValue: number;         // quantity * unitPrice, ทศนิยม 2 ตำแหน่ง
}

// ข้อมูลแยกตามหมวดหมู่
export interface CategoryBreakdownItem {
  categoryName: string;
  categoryId: string;
  amount: number;             // ทศนิยม 2 ตำแหน่ง
  itemCount: number;
  percentage: number;         // ทศนิยม 1 ตำแหน่ง
}

// ข้อมูลสรุปรวม
export interface ExpenseSummary {
  totalAmount: number;        // ทศนิยม 2 ตำแหน่ง
  totalItems: number;         // จำนวนเต็ม
  totalCategories: number;    // จำนวนเต็ม
}

// โครงสร้าง API response เต็ม (format=json)
export interface ExpenseSummaryData {
  summary: ExpenseSummary;
  categoryBreakdown: CategoryBreakdownItem[];
  items: ExpenseItem[];
  generatedAt: string;        // UTC ISO string
}

// API Response wrapper
export interface ExpenseSummaryApiResponse {
  success: boolean;
  data?: ExpenseSummaryData;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>[];
  };
}
