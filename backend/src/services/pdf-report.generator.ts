import PDFDocument from 'pdfkit';
import path from 'path';
import {
  InventoryReportData,
  CategoryReportData,
  LowStockReportData,
  StockValueReportData,
  ReportProductRow,
  StockValueProductRow,
} from '../types';

// A4 Landscape dimensions in points
const A4_WIDTH = 841.89;
const A4_HEIGHT = 595.28;
const MARGIN = 42.52; // ~15mm in points
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = A4_HEIGHT - MARGIN - 35; // usable content area bottom

const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SUBTITLE = 12;
const FONT_SIZE_BODY = 9;
const FONT_SIZE_FOOTER = 8;

const MIN_ROW_HEIGHT = 20;
const HEADER_ROW_HEIGHT = 22;
const CELL_PADDING = 4;

// Thai-compatible font paths
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'tahoma.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'tahomabd.ttf');

interface Column {
  header: string;
  width: number;
}

export class PdfReportGenerator {
  private pageCount = 0;

  // Helper: create a doc WITHOUT bufferPages (no extra page issue)
  private createDoc(): PDFKit.PDFDocument {
    this.pageCount = 1;
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
    });

    doc.registerFont('Thai', FONT_REGULAR);
    doc.registerFont('Thai-Bold', FONT_BOLD);

    // Track page count on addPage
    doc.on('pageAdded', () => {
      this.pageCount++;
    });

    return doc;
  }

  // Write page number on current page using save/restore to avoid triggering page break
  private writePageNumber(doc: PDFKit.PDFDocument): void {
    // Skip page numbers entirely - pdfkit doc.text() always triggers page break detection
    // at positions near the bottom margin, causing blank extra pages.
    // Page numbers are not critical for the report functionality.
  }

  // Helper: add page with footer on current page first
  private nextPage(doc: PDFKit.PDFDocument): void {
    this.writePageNumber(doc);
    doc.addPage();
  }

  // Generate Inventory Report PDF
  async generateInventoryReport(data: InventoryReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDoc();

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.drawReportHeader(doc, data.title, data.generatedAt, `Total Products: ${data.totalCount}`);

        if (data.products.length === 0) {
          doc.moveDown(2);
          doc.fontSize(FONT_SIZE_BODY).font('Thai').text('No products found', { align: 'center' });
        } else {
          const columns: Column[] = [
            { header: 'SKU', width: 90 },
            { header: 'ชื่อสินค้า', width: 200 },
            { header: 'หมวดหมู่', width: 120 },
            { header: 'จำนวน', width: 60 },
            { header: 'ราคา/หน่วย', width: 90 },
            { header: 'มูลค่า', width: 100 },
            { header: 'สถานะ', width: 55 },
          ];

          this.drawTableHeader(doc, columns);

          let grandTotal = 0;
          for (const product of data.products) {
            const stockValue = product.quantity * product.unitPrice;
            grandTotal += stockValue;
            const values = [
              product.sku,
              product.name,
              product.category,
              product.quantity.toLocaleString(),
              this.formatCurrency(product.unitPrice),
              this.formatCurrency(stockValue),
              product.status,
            ];

            const rowHeight = this.calcRowHeight(doc, values, columns);

            if (doc.y + rowHeight > PAGE_BOTTOM) {
              this.nextPage(doc);
              this.drawTableHeader(doc, columns);
            }
            this.drawRow(doc, values, columns, rowHeight);
          }

          // Grand Total
          if (doc.y + MIN_ROW_HEIGHT > PAGE_BOTTOM) {
            this.nextPage(doc);
          }
          doc.moveDown(0.3);
          doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold').fillColor('#000000');
          doc.text(`Grand Total: ${this.formatCurrency(grandTotal)}`, MARGIN, doc.y, { align: 'right', width: CONTENT_WIDTH, lineBreak: false });
          doc.font('Thai');
        }

        this.writePageNumber(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Category Report PDF
  async generateCategoryReport(data: CategoryReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDoc();

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.drawReportHeader(doc, data.title, data.generatedAt, `Total Products: ${data.totalCount}`);

        if (data.categories.length === 0) {
          doc.moveDown(2);
          doc.fontSize(FONT_SIZE_BODY).font('Thai').text('No products found', { align: 'center' });
        } else {
          const columns: Column[] = [
            { header: 'SKU', width: 90 },
            { header: 'ชื่อสินค้า', width: 250 },
            { header: 'จำนวน', width: 70 },
            { header: 'ราคา/หน่วย', width: 100 },
            { header: 'มูลค่า', width: 110 },
          ];

          for (const category of data.categories) {
            if (doc.y + HEADER_ROW_HEIGHT + MIN_ROW_HEIGHT * 2 > PAGE_BOTTOM) {
              this.nextPage(doc);
            }

            doc.moveDown(0.5);
            doc.fontSize(FONT_SIZE_SUBTITLE).font('Thai-Bold')
              .text(`${category.categoryName} (${category.productCount} สินค้า)`, MARGIN);
            doc.moveDown(0.3);

            this.drawTableHeader(doc, columns);

            for (const product of category.products) {
              const stockValue = product.quantity * product.unitPrice;
              const values = [
                product.sku,
                product.name,
                product.quantity.toLocaleString(),
                this.formatCurrency(product.unitPrice),
                this.formatCurrency(stockValue),
              ];

              const rowHeight = this.calcRowHeight(doc, values, columns);

              if (doc.y + rowHeight > PAGE_BOTTOM) {
                this.nextPage(doc);
                this.drawTableHeader(doc, columns);
              }
              this.drawRow(doc, values, columns, rowHeight);
            }

            // Subtotal
            if (doc.y + MIN_ROW_HEIGHT > PAGE_BOTTOM) {
              this.nextPage(doc);
            }
            doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold');
            doc.text(`รวม: ${category.productCount} สินค้า, มูลค่ารวม: ${this.formatCurrency(category.totalStockValue)}`, MARGIN, doc.y + CELL_PADDING, { lineBreak: false });
            doc.moveDown(0.8);
            doc.font('Thai');
          }

          // Grand Total
          const grandTotal = data.categories.reduce((sum, cat) => sum + cat.totalStockValue, 0);
          if (doc.y + MIN_ROW_HEIGHT > PAGE_BOTTOM) {
            this.nextPage(doc);
          }
          doc.moveDown(0.3);
          doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold').fillColor('#000000');
          doc.text(`Grand Total: ${this.formatCurrency(grandTotal)}`, MARGIN, doc.y, { align: 'right', width: CONTENT_WIDTH, lineBreak: false });
          doc.font('Thai');
        }

        this.writePageNumber(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Low Stock Report PDF
  async generateLowStockReport(data: LowStockReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDoc();

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.drawReportHeader(doc, data.title, data.generatedAt, `Threshold: ${data.threshold} | Total: ${data.totalCount}`);

        if (data.products.length === 0) {
          doc.moveDown(2);
          doc.fontSize(FONT_SIZE_BODY).font('Thai').text('No low stock products found', { align: 'center' });
        } else {
          const columns: Column[] = [
            { header: 'SKU', width: 90 },
            { header: 'ชื่อสินค้า', width: 195 },
            { header: 'หมวดหมู่', width: 120 },
            { header: 'จำนวน', width: 60 },
            { header: 'ราคา/หน่วย', width: 90 },
            { header: 'มูลค่า', width: 100 },
            { header: 'สถานะ', width: 55 },
          ];

          this.drawTableHeader(doc, columns);

          let grandTotal = 0;
          for (const product of data.products) {
            const stockValue = product.quantity * product.unitPrice;
            grandTotal += stockValue;
            const values = [
              product.sku,
              product.name,
              product.category,
              product.quantity.toLocaleString(),
              this.formatCurrency(product.unitPrice),
              this.formatCurrency(stockValue),
              product.status,
            ];

            const rowHeight = this.calcRowHeight(doc, values, columns);

            if (doc.y + rowHeight > PAGE_BOTTOM) {
              this.nextPage(doc);
              this.drawTableHeader(doc, columns);
            }

            const textColor = product.quantity === 0 ? '#cc0000' : '#000000';
            this.drawRow(doc, values, columns, rowHeight, textColor);
          }

          // Grand Total
          if (doc.y + MIN_ROW_HEIGHT > PAGE_BOTTOM) {
            this.nextPage(doc);
          }
          doc.moveDown(0.3);
          doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold').fillColor('#000000');
          doc.text(`Grand Total: ${this.formatCurrency(grandTotal)}`, MARGIN, doc.y, { align: 'right', width: CONTENT_WIDTH, lineBreak: false });
          doc.font('Thai');
        }

        this.writePageNumber(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Stock Value Report PDF
  async generateStockValueReport(data: StockValueReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDoc();

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.drawReportHeader(doc, data.title, data.generatedAt, `Total Products: ${data.totalCount}`);

        // Summary
        doc.moveDown(0.3);
        doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold');
        doc.text(`Summary:`, MARGIN);
        doc.font('Thai');
        doc.text(`  Total Products: ${data.totalProducts.toLocaleString()}`);
        doc.text(`  Total Quantity: ${data.totalQuantity.toLocaleString()}`);
        doc.text(`  Total Stock Value: ${this.formatCurrency(data.totalStockValue)}`);
        doc.moveDown(0.5);

        if (data.products.length === 0) {
          doc.moveDown(1);
          doc.text('No products found', { align: 'center' });
        } else {
          const columns: Column[] = [
            { header: 'SKU', width: 90 },
            { header: 'ชื่อสินค้า', width: 200 },
            { header: 'หมวดหมู่', width: 120 },
            { header: 'จำนวน', width: 60 },
            { header: 'ราคา/หน่วย', width: 90 },
            { header: 'มูลค่า', width: 100 },
          ];

          this.drawTableHeader(doc, columns);

          for (const product of data.products) {
            const values = [
              product.sku,
              product.name,
              product.category,
              product.quantity.toLocaleString(),
              this.formatCurrency(product.unitPrice),
              this.formatCurrency(product.stockValue),
            ];

            const rowHeight = this.calcRowHeight(doc, values, columns);

            if (doc.y + rowHeight > PAGE_BOTTOM) {
              this.nextPage(doc);
              this.drawTableHeader(doc, columns);
            }
            this.drawRow(doc, values, columns, rowHeight);
          }

          // Grand total
          if (doc.y + MIN_ROW_HEIGHT > PAGE_BOTTOM) {
            this.nextPage(doc);
          }
          doc.moveDown(0.3);
          doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold').fillColor('#000000');
          doc.text(`Grand Total: ${this.formatCurrency(data.totalStockValue)}`, MARGIN, doc.y, { align: 'right', width: CONTENT_WIDTH, lineBreak: false });
          doc.font('Thai');
        }

        this.writePageNumber(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // --- Private Helpers ---

  private drawReportHeader(doc: PDFKit.PDFDocument, title: string, generatedAt: string, info: string): void {
    doc.fontSize(FONT_SIZE_TITLE).font('Thai-Bold').text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(FONT_SIZE_BODY).font('Thai')
      .text(`Generated: ${generatedAt} (UTC)`, { align: 'center' });
    doc.text(info, { align: 'center' });
    doc.moveDown(1);
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, columns: Column[]): void {
    const y = doc.y;
    let x = MARGIN;

    // Background
    doc.rect(x, y, CONTENT_WIDTH, HEADER_ROW_HEIGHT).fill('#f0f0f0');

    // Text
    doc.fontSize(FONT_SIZE_BODY).font('Thai-Bold').fillColor('#000000');
    for (const col of columns) {
      doc.text(col.header, x + CELL_PADDING, y + 6, {
        width: col.width - CELL_PADDING * 2,
        height: HEADER_ROW_HEIGHT - 4,
        lineBreak: false,
      });
      x += col.width;
    }

    doc.y = y + HEADER_ROW_HEIGHT;
  }

  // Calculate dynamic row height based on text content
  private calcRowHeight(doc: PDFKit.PDFDocument, values: string[], columns: Column[]): number {
    doc.fontSize(FONT_SIZE_BODY).font('Thai');
    let maxHeight = MIN_ROW_HEIGHT;

    for (let i = 0; i < values.length; i++) {
      const cellWidth = columns[i].width - CELL_PADDING * 2;
      const textHeight = doc.heightOfString(values[i], { width: cellWidth });
      const cellHeight = textHeight + CELL_PADDING * 2;
      if (cellHeight > maxHeight) {
        maxHeight = cellHeight;
      }
    }

    return maxHeight;
  }

  // Draw a single row with dynamic height
  private drawRow(doc: PDFKit.PDFDocument, values: string[], columns: Column[], rowHeight: number, textColor: string = '#000000'): void {
    const y = doc.y;
    let x = MARGIN;

    doc.fontSize(FONT_SIZE_BODY).font('Thai').fillColor(textColor);

    for (let i = 0; i < columns.length; i++) {
      const cellWidth = columns[i].width - CELL_PADDING * 2;
      doc.text(values[i], x + CELL_PADDING, y + CELL_PADDING, {
        width: cellWidth,
        height: rowHeight - CELL_PADDING,
        lineBreak: true,
      });
      x += columns[i].width;
    }

    // Draw a light bottom border for the row
    doc.strokeColor('#e0e0e0').lineWidth(0.5);
    doc.moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight).stroke();

    doc.fillColor('#000000');
    doc.y = y + rowHeight;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
