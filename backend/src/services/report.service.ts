import { getPool, sql } from '../database';
import {
  ReportFilters,
  ReportOptions,
  ReportResult,
  ReportProductRow,
  InventoryReportData,
  CategoryReportData,
  CategoryGroup,
  LowStockReportData,
  StockValueReportData,
  StockValueProductRow,
} from '../types';
import { PdfReportGenerator } from './pdf-report.generator';
import { ExcelReportGenerator } from './excel-report.generator';

export class ReportService {
  private pdfGenerator = new PdfReportGenerator();
  private excelGenerator = new ExcelReportGenerator();

  // Helper: format current UTC time as YYYY-MM-DD HH:mm
  private formatUtcNow(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // Helper: format date for filename YYYY-MM-DD
  private formatDateForFilename(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Task 2.1: Get inventory report data
  async getInventoryData(filters: ReportFilters): Promise<InventoryReportData> {
    const pool = await getPool();
    const request = pool.request();
    (request as any).timeout = 30000;

    const whereConditions: string[] = [];

    if (filters.category) {
      whereConditions.push('p.category LIKE @category');
      request.input('category', sql.NVarChar, `%${filters.category}%`);
    }

    if (filters.status) {
      whereConditions.push('p.status = @status');
      request.input('status', sql.NVarChar, filters.status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await request.query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unit_price: number;
      status: string;
    }>(
      `SELECT p.id, p.name, p.sku, p.category, p.quantity, p.unit_price, p.status
       FROM products p
       ${whereClause}
       ORDER BY p.category ASC, p.name ASC`
    );

    const products: ReportProductRow[] = result.recordset.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      status: row.status as 'active' | 'inactive',
    }));

    return {
      title: 'Inventory Report',
      generatedAt: this.formatUtcNow(),
      totalCount: products.length,
      products,
    };
  }

  // Task 2.2: Get category report data
  async getCategoryData(filters: ReportFilters): Promise<CategoryReportData> {
    const pool = await getPool();
    const request = pool.request();
    (request as any).timeout = 30000;

    const whereConditions: string[] = [];

    if (filters.category) {
      whereConditions.push('p.category LIKE @category');
      request.input('category', sql.NVarChar, `%${filters.category}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await request.query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unit_price: number;
      status: string;
    }>(
      `SELECT p.id, p.name, p.sku, p.category, p.quantity, p.unit_price, p.status
       FROM products p
       ${whereClause}
       ORDER BY p.category ASC, p.name ASC`
    );

    // Group by category
    const categoryMap = new Map<string, ReportProductRow[]>();

    for (const row of result.recordset) {
      const catName = row.category || 'Uncategorized';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, []);
      }
      categoryMap.get(catName)!.push({
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category || 'Uncategorized',
        quantity: row.quantity,
        unitPrice: Number(row.unit_price),
        status: row.status as 'active' | 'inactive',
      });
    }

    // Build category groups sorted alphabetically, Uncategorized last
    const sortedKeys = Array.from(categoryMap.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    const categories: CategoryGroup[] = sortedKeys.map(catName => {
      const products = categoryMap.get(catName)!;
      const totalStockValue = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
      return {
        categoryName: catName,
        productCount: products.length,
        totalStockValue,
        products,
      };
    });

    const totalCount = result.recordset.length;

    return {
      title: 'Category Report',
      generatedAt: this.formatUtcNow(),
      totalCount,
      categories,
    };
  }

  // Task 2.3: Get low stock report data
  async getLowStockData(threshold: number = 10): Promise<LowStockReportData> {
    const pool = await getPool();
    const request = pool.request();
    (request as any).timeout = 30000;

    request.input('threshold', sql.Int, threshold);

    const result = await request.query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unit_price: number;
      status: string;
    }>(
      `SELECT p.id, p.name, p.sku, p.category, p.quantity, p.unit_price, p.status
       FROM products p
       WHERE p.quantity <= @threshold
       ORDER BY p.quantity ASC`
    );

    const products: ReportProductRow[] = result.recordset.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      status: row.status as 'active' | 'inactive',
    }));

    return {
      title: 'Low Stock Report',
      generatedAt: this.formatUtcNow(),
      totalCount: products.length,
      threshold,
      products,
    };
  }

  // Task 2.4: Get stock value report data
  async getStockValueData(filters: ReportFilters): Promise<StockValueReportData> {
    const pool = await getPool();
    const request = pool.request();
    (request as any).timeout = 30000;

    const whereConditions: string[] = [];

    if (filters.category) {
      whereConditions.push('p.category LIKE @category');
      request.input('category', sql.NVarChar, `%${filters.category}%`);
    }

    if (filters.status) {
      whereConditions.push('p.status = @status');
      request.input('status', sql.NVarChar, filters.status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await request.query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unit_price: number;
      status: string;
    }>(
      `SELECT p.id, p.name, p.sku, p.category, p.quantity, p.unit_price, p.status
       FROM products p
       ${whereClause}
       ORDER BY (p.quantity * p.unit_price) DESC`
    );

    const products: StockValueProductRow[] = result.recordset.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      status: row.status as 'active' | 'inactive',
      stockValue: row.quantity * Number(row.unit_price),
    }));

    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalStockValue = products.reduce((sum, p) => sum + p.stockValue, 0);

    return {
      title: 'Stock Value Report',
      generatedAt: this.formatUtcNow(),
      totalCount: totalProducts,
      totalProducts,
      totalQuantity,
      totalStockValue,
      products,
    };
  }

  // Task 2.5: Generate report (orchestrator)
  async generateReport(options: ReportOptions): Promise<ReportResult> {
    const TIMEOUT_MS = 30000;

    const generatePromise = this.doGenerateReport(options);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('REPORT_TIMEOUT')), TIMEOUT_MS);
    });

    return Promise.race([generatePromise, timeoutPromise]);
  }

  private async doGenerateReport(options: ReportOptions): Promise<ReportResult> {
    const { type, format, filters = {}, threshold } = options;
    const dateStr = this.formatDateForFilename();

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'pdf') {
      contentType = 'application/pdf';
    } else {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    switch (type) {
      case 'inventory': {
        const data = await this.getInventoryData(filters);
        filename = `inventory_${dateStr}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        buffer = format === 'pdf'
          ? await this.pdfGenerator.generateInventoryReport(data)
          : await this.excelGenerator.generateInventoryReport(data);
        break;
      }
      case 'category': {
        const data = await this.getCategoryData(filters);
        filename = `category_${dateStr}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        buffer = format === 'pdf'
          ? await this.pdfGenerator.generateCategoryReport(data)
          : await this.excelGenerator.generateCategoryReport(data);
        break;
      }
      case 'low-stock': {
        const data = await this.getLowStockData(threshold || 10);
        filename = `low-stock_${dateStr}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        buffer = format === 'pdf'
          ? await this.pdfGenerator.generateLowStockReport(data)
          : await this.excelGenerator.generateLowStockReport(data);
        break;
      }
      case 'stock-value': {
        const data = await this.getStockValueData(filters);
        filename = `stock-value_${dateStr}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        buffer = format === 'pdf'
          ? await this.pdfGenerator.generateStockValueReport(data)
          : await this.excelGenerator.generateStockValueReport(data);
        break;
      }
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    return { buffer, filename, contentType };
  }
}
