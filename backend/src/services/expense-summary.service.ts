import { getPool, sql } from '../database';
import {
  ExpenseSummaryFilters,
  ExpenseItem,
  CategoryBreakdownItem,
  ExpenseSummaryData,
  ExpenseSummaryReportResult,
} from '../types';
import { PdfReportGenerator } from './pdf-report.generator';
import { ExcelReportGenerator } from './excel-report.generator';
import PDFDocument from 'pdfkit';
import path from 'path';
import ExcelJS from 'exceljs';

// Thai-compatible font paths
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'tahoma.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'tahomabd.ttf');

export class ExpenseSummaryService {
  private static TIMEOUT_MS = 30000;

  // Helper: format current UTC date as YYYY-MM-DD for filename
  private formatDateForFilename(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: format current UTC time as ISO string
  private formatUtcNow(): string {
    return new Date().toISOString();
  }

  // Helper: format currency
  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ดึงข้อมูลสรุปค่าใช้จ่าย
  async getExpenseSummaryData(filters: ExpenseSummaryFilters): Promise<ExpenseSummaryData> {
    const TIMEOUT_MS = ExpenseSummaryService.TIMEOUT_MS;

    const dataPromise = this.doGetExpenseSummaryData(filters);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('REPORT_TIMEOUT')), TIMEOUT_MS);
    });

    return Promise.race([dataPromise, timeoutPromise]);
  }

  private async doGetExpenseSummaryData(filters: ExpenseSummaryFilters): Promise<ExpenseSummaryData> {
    const pool = await getPool();
    const request = pool.request();
    (request as any).timeout = 30000;

    request.input('startDate', sql.Date, filters.startDate);
    request.input('endDate', sql.Date, filters.endDate);

    let categoryFilter = '';
    if (filters.categories && filters.categories.length > 0) {
      // Use parameterized IN clause
      const categoryParams = filters.categories.map((cat, i) => {
        const paramName = `cat${i}`;
        request.input(paramName, sql.NVarChar, cat);
        return `@${paramName}`;
      });
      categoryFilter = `AND p.category_id IN (${categoryParams.join(',')})`;
    }

    const result = await request.query<{
      id: string;
      name: string;
      sku: string;
      category: string;
      categoryId: string;
      quantity: number;
      unit_price: number;
      totalValue: number;
    }>(
      `SELECT 
        p.id, p.name, p.sku, 
        ISNULL(c.name, p.category) as category,
        CAST(ISNULL(p.category_id, '00000000-0000-0000-0000-000000000000') AS NVARCHAR(36)) as categoryId,
        p.quantity, p.unit_price,
        ROUND(CAST(p.quantity AS DECIMAL(18,2)) * p.unit_price, 2) as totalValue
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
        AND p.created_at >= @startDate
        AND p.created_at < DATEADD(day, 1, @endDate)
        ${categoryFilter}
      ORDER BY (CAST(p.quantity AS DECIMAL(18,2)) * p.unit_price) DESC`
    );

    // Map to ExpenseItem[]
    const items: ExpenseItem[] = result.recordset.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category || 'Uncategorized',
      categoryId: row.categoryId === '00000000-0000-0000-0000-000000000000' ? '' : (row.categoryId || ''),
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      totalValue: Number(row.totalValue),
    }));

    // คำนวณ summary
    const totalAmount = items.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItems = items.length;
    const uniqueCategories = new Set(items.map(item => item.categoryId || item.category));
    const totalCategories = uniqueCategories.size;

    // สร้าง categoryBreakdown
    const categoryMap = new Map<string, { categoryName: string; categoryId: string; amount: number; itemCount: number }>();
    for (const item of items) {
      const key = item.categoryId || item.category;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryName: item.category,
          categoryId: item.categoryId,
          amount: 0,
          itemCount: 0,
        });
      }
      const cat = categoryMap.get(key)!;
      cat.amount += item.totalValue;
      cat.itemCount += 1;
    }

    const categoryBreakdown: CategoryBreakdownItem[] = Array.from(categoryMap.values())
      .map(cat => ({
        categoryName: cat.categoryName,
        categoryId: cat.categoryId,
        amount: Math.round(cat.amount * 100) / 100,
        itemCount: cat.itemCount,
        percentage: totalAmount > 0
          ? Math.round((cat.amount / totalAmount) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalItems,
        totalCategories,
      },
      categoryBreakdown,
      items,
      generatedAt: this.formatUtcNow(),
    };
  }

  // สร้างรายงาน PDF
  async generatePdfReport(data: ExpenseSummaryData): Promise<ExpenseSummaryReportResult> {
    const TIMEOUT_MS = ExpenseSummaryService.TIMEOUT_MS;

    const generatePromise = this.doGeneratePdfReport(data);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('REPORT_TIMEOUT')), TIMEOUT_MS);
    });

    const buffer = await Promise.race([generatePromise, timeoutPromise]);
    const dateStr = this.formatDateForFilename();

    return {
      buffer,
      filename: `expense-summary_${dateStr}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private async doGeneratePdfReport(data: ExpenseSummaryData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 42.52, bottom: 62.52, left: 42.52, right: 42.52 },
          autoFirstPage: true,
        });

        doc.registerFont('Thai', FONT_REGULAR);
        doc.registerFont('Thai-Bold', FONT_BOLD);

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const MARGIN = 42.52;
        const A4_WIDTH = 841.89;
        const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

        // Title
        doc.fontSize(16).font('Thai-Bold').text('รายงานสรุปค่าใช้จ่ายสินค้าคงคลัง', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Thai')
          .text(`Generated: ${data.generatedAt}`, { align: 'center' });
        doc.moveDown(0.5);

        // Summary
        doc.fontSize(10).font('Thai-Bold').text('สรุปภาพรวม');
        doc.fontSize(9).font('Thai');
        doc.text(`  มูลค่ารวม: ฿${this.formatCurrency(data.summary.totalAmount)}`);
        doc.text(`  จำนวนรายการ: ${data.summary.totalItems.toLocaleString()}`);
        doc.text(`  จำนวนหมวดหมู่: ${data.summary.totalCategories}`);
        doc.moveDown(0.5);

        // Category Breakdown Table
        if (data.categoryBreakdown.length > 0) {
          doc.fontSize(10).font('Thai-Bold').text('สรุปตามหมวดหมู่');
          doc.moveDown(0.3);

          const catColumns = [
            { header: 'หมวดหมู่', width: 200 },
            { header: 'มูลค่า (฿)', width: 120 },
            { header: 'จำนวนรายการ', width: 100 },
            { header: 'สัดส่วน (%)', width: 100 },
          ];

          // Header
          let x = MARGIN;
          const headerY = doc.y;
          doc.rect(x, headerY, CONTENT_WIDTH, 20).fill('#f0f0f0');
          doc.fontSize(9).font('Thai-Bold').fillColor('#000000');
          for (const col of catColumns) {
            doc.text(col.header, x + 4, headerY + 5, { width: col.width - 8, lineBreak: false });
            x += col.width;
          }
          doc.y = headerY + 20;

          // Rows
          doc.font('Thai');
          for (const cat of data.categoryBreakdown) {
            x = MARGIN;
            const rowY = doc.y;
            const values = [
              cat.categoryName,
              this.formatCurrency(cat.amount),
              cat.itemCount.toString(),
              cat.percentage.toFixed(1),
            ];
            for (let i = 0; i < catColumns.length; i++) {
              doc.text(values[i], x + 4, rowY + 4, { width: catColumns[i].width - 8, lineBreak: false });
              x += catColumns[i].width;
            }
            doc.y = rowY + 18;
          }
          doc.moveDown(0.5);
        }

        // Items Table
        if (data.items.length > 0) {
          doc.fontSize(10).font('Thai-Bold').text('รายละเอียดสินค้า');
          doc.moveDown(0.3);

          const itemColumns = [
            { header: 'ชื่อสินค้า', width: 200 },
            { header: 'SKU', width: 110 },
            { header: 'หมวดหมู่', width: 120 },
            { header: 'จำนวน', width: 60 },
            { header: 'ราคา/หน่วย', width: 95 },
            { header: 'มูลค่ารวม', width: 95 },
          ];

          // Header
          let x = MARGIN;
          const headerY = doc.y;
          doc.rect(x, headerY, CONTENT_WIDTH, 20).fill('#f0f0f0');
          doc.fontSize(9).font('Thai-Bold').fillColor('#000000');
          for (const col of itemColumns) {
            doc.text(col.header, x + 4, headerY + 5, { width: col.width - 8, lineBreak: false });
            x += col.width;
          }
          doc.y = headerY + 20;

          // Rows with dynamic height
          doc.font('Thai').fontSize(9);
          for (const item of data.items) {
            const values = [
              item.name,
              item.sku,
              item.category,
              item.quantity.toLocaleString(),
              this.formatCurrency(item.unitPrice),
              this.formatCurrency(item.totalValue),
            ];

            // คำนวณความสูง row จากข้อความที่ยาวที่สุด
            let maxHeight = 16;
            for (let i = 0; i < itemColumns.length; i++) {
              const textHeight = doc.heightOfString(values[i], { width: itemColumns[i].width - 8 });
              const cellHeight = textHeight + 8;
              if (cellHeight > maxHeight) maxHeight = cellHeight;
            }

            // ตรวจสอบว่าเกินหน้าหรือไม่
            if (doc.y + maxHeight > 540) {
              doc.addPage();
              // วาด header ใหม่
              x = MARGIN;
              const newHeaderY = doc.y;
              doc.rect(x, newHeaderY, CONTENT_WIDTH, 20).fill('#f0f0f0');
              doc.fontSize(9).font('Thai-Bold').fillColor('#000000');
              for (const col of itemColumns) {
                doc.text(col.header, x + 4, newHeaderY + 5, { width: col.width - 8, lineBreak: false });
                x += col.width;
              }
              doc.y = newHeaderY + 20;
              doc.font('Thai').fontSize(9);
            }

            x = MARGIN;
            const rowY = doc.y;
            for (let i = 0; i < itemColumns.length; i++) {
              // คอลัมน์ชื่อสินค้า (index 0) ให้ wrap text ได้
              if (i === 0) {
                doc.text(values[i], x + 4, rowY + 4, { width: itemColumns[i].width - 8, lineBreak: true, height: maxHeight - 4 });
              } else {
                doc.text(values[i], x + 4, rowY + 4, { width: itemColumns[i].width - 8, lineBreak: false });
              }
              x += itemColumns[i].width;
            }
            doc.y = rowY + maxHeight;
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // สร้างรายงาน Excel
  async generateExcelReport(data: ExpenseSummaryData): Promise<ExpenseSummaryReportResult> {
    const TIMEOUT_MS = ExpenseSummaryService.TIMEOUT_MS;

    const generatePromise = this.doGenerateExcelReport(data);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('REPORT_TIMEOUT')), TIMEOUT_MS);
    });

    const buffer = await Promise.race([generatePromise, timeoutPromise]);
    const dateStr = this.formatDateForFilename();

    return {
      buffer,
      filename: `expense-summary_${dateStr}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async doGenerateExcelReport(data: ExpenseSummaryData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('สรุปภาพรวม');
    const titleRow = summarySheet.addRow(['รายงานสรุปค่าใช้จ่ายสินค้าคงคลัง']);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    summarySheet.addRow([`สร้างเมื่อ: ${data.generatedAt}`]);
    summarySheet.addRow([]);

    summarySheet.addRow(['มูลค่ารวม', data.summary.totalAmount]);
    summarySheet.getRow(4).getCell(2).numFmt = '#,##0.00';
    summarySheet.addRow(['จำนวนรายการ', data.summary.totalItems]);
    summarySheet.addRow(['จำนวนหมวดหมู่', data.summary.totalCategories]);
    summarySheet.addRow([]);

    // Category Breakdown
    const catHeaderRow = summarySheet.addRow(['หมวดหมู่', 'มูลค่า (฿)', 'จำนวนรายการ', 'สัดส่วน (%)']);
    catHeaderRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const cat of data.categoryBreakdown) {
      const row = summarySheet.addRow([cat.categoryName, cat.amount, cat.itemCount, cat.percentage]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '0.0';
    }

    // Auto-fit columns
    summarySheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length + 2 : 0;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      column.width = Math.min(maxLength, 50);
    });

    // Sheet 2: Items Detail
    const itemsSheet = workbook.addWorksheet('รายละเอียดสินค้า');
    const headers = ['ชื่อสินค้า', 'SKU', 'หมวดหมู่', 'จำนวน', 'ราคาต่อหน่วย', 'มูลค่ารวม'];
    const headerRow = itemsSheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const item of data.items) {
      const row = itemsSheet.addRow([
        item.name,
        item.sku,
        item.category,
        item.quantity,
        item.unitPrice,
        item.totalValue,
      ]);
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
    }

    // Grand Total
    itemsSheet.addRow([]);
    const totalRow = itemsSheet.addRow(['', '', '', '', 'มูลค่ารวมทั้งหมด', data.summary.totalAmount]);
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(6).numFmt = '#,##0.00';

    // Auto-fit columns
    itemsSheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length + 2 : 0;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      column.width = Math.min(maxLength, 50);
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
