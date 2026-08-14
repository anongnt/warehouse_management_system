import ExcelJS from 'exceljs';
import {
  InventoryReportData,
  CategoryReportData,
  LowStockReportData,
  StockValueReportData,
} from '../types';

export class ExcelReportGenerator {
  // Generate Inventory Report Excel
  async generateInventoryReport(data: InventoryReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Report');

    // Header row
    const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit Price', 'Stock Value', 'Status'];
    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Data rows
    let grandTotal = 0;
    for (const product of data.products) {
      const stockValue = product.quantity * product.unitPrice;
      grandTotal += stockValue;
      const row = sheet.addRow([
        product.sku,
        product.name,
        product.category,
        product.quantity,
        product.unitPrice,
        stockValue,
        product.status,
      ]);

      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
    }

    // Grand Total row
    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', '', 'Grand Total', grandTotal, '']);
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(6).numFmt = '#,##0.00';

    // Auto-fit column widths
    this.autoFitColumns(sheet);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Generate Category Report Excel
  async generateCategoryReport(data: CategoryReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Category Report');

    for (const category of data.categories) {
      // Category header row
      const catRow = sheet.addRow([`${category.categoryName} (${category.productCount} products)`]);
      catRow.getCell(1).font = { bold: true, size: 12 };
      catRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Column headers
      const headers = ['SKU', 'Name', 'Quantity', 'Unit Price', 'Stock Value'];
      const headerRow = sheet.addRow(headers);
      this.styleHeaderRow(headerRow);

      // Products
      for (const product of category.products) {
        const stockValue = product.quantity * product.unitPrice;
        const row = sheet.addRow([
          product.sku,
          product.name,
          product.quantity,
          product.unitPrice,
          stockValue,
        ]);
        row.getCell(3).numFmt = '#,##0';
        row.getCell(4).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00';
      }

      // Subtotal row
      const subtotalRow = sheet.addRow([
        '',
        'Subtotal',
        category.productCount,
        '',
        category.totalStockValue,
      ]);
      subtotalRow.getCell(2).font = { bold: true };
      subtotalRow.getCell(3).numFmt = '#,##0';
      subtotalRow.getCell(5).numFmt = '#,##0.00';
      subtotalRow.getCell(5).font = { bold: true };

      // Empty row between categories
      sheet.addRow([]);
    }

    // Grand Total
    const grandTotal = data.categories.reduce((sum, cat) => sum + cat.totalStockValue, 0);
    const grandTotalRow = sheet.addRow(['', 'Grand Total', '', '', grandTotal]);
    grandTotalRow.getCell(2).font = { bold: true, size: 11 };
    grandTotalRow.getCell(5).font = { bold: true, size: 11 };
    grandTotalRow.getCell(5).numFmt = '#,##0.00';

    this.autoFitColumns(sheet);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Generate Low Stock Report Excel
  async generateLowStockReport(data: LowStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Low Stock Report');

    // Info row
    const infoRow = sheet.addRow([`Threshold: ${data.threshold}`]);
    infoRow.getCell(1).font = { italic: true };
    sheet.addRow([]);

    // Header row
    const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit Price', 'Stock Value', 'Status'];
    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Data rows
    let grandTotal = 0;
    for (const product of data.products) {
      const stockValue = product.quantity * product.unitPrice;
      grandTotal += stockValue;
      const row = sheet.addRow([
        product.sku,
        product.name,
        product.category,
        product.quantity,
        product.unitPrice,
        stockValue,
        product.status,
      ]);

      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      // Red background for zero quantity
      if (product.quantity === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' },
          };
        });
      }
    }

    // Grand Total row
    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', '', 'Grand Total', grandTotal, '']);
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(6).numFmt = '#,##0.00';

    this.autoFitColumns(sheet);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Generate Stock Value Report Excel
  async generateStockValueReport(data: StockValueReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Value Report');

    // Header row
    const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit Price', 'Stock Value'];
    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Data rows
    for (const product of data.products) {
      const row = sheet.addRow([
        product.sku,
        product.name,
        product.category,
        product.quantity,
        product.unitPrice,
        product.stockValue,
      ]);

      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
    }

    // Empty row
    sheet.addRow([]);

    // Summary section
    const summaryHeaderRow = sheet.addRow(['Summary']);
    summaryHeaderRow.getCell(1).font = { bold: true, size: 12 };

    const totalProductsRow = sheet.addRow(['Total Products', data.totalProducts]);
    totalProductsRow.getCell(2).numFmt = '#,##0';

    const totalQuantityRow = sheet.addRow(['Total Quantity', data.totalQuantity]);
    totalQuantityRow.getCell(2).numFmt = '#,##0';

    const totalValueRow = sheet.addRow(['Total Stock Value', data.totalStockValue]);
    totalValueRow.getCell(2).numFmt = '#,##0.00';
    totalValueRow.getCell(1).font = { bold: true };
    totalValueRow.getCell(2).font = { bold: true };

    this.autoFitColumns(sheet);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // --- Private Helpers ---

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        bottom: { style: 'thin' },
      };
    });
  }

  private autoFitColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach((column) => {
      let maxLength = 8; // minimum width
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length + 2 : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength, 50); // max 50
    });
  }
}
