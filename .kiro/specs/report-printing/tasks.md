# Implementation Plan: Report Printing

## Overview

พัฒนาระบบสร้างรายงานและ export ไฟล์สำหรับระบบ Warehouse Management System โดยเพิ่มรายงาน 4 ประเภท (Inventory, Category, Low Stock, Stock Value) พร้อมรองรับการ export เป็น PDF และ Excel ตามสถาปัตยกรรมเดิมที่ใช้ Express/TypeScript (backend) และ React/TypeScript (frontend)

## Tasks

- [ ] 1. ตั้งค่า types, interfaces, และ validator สำหรับ report
  - [ ] 1.1 สร้าง interfaces และ types ข้อมูลรายงาน
    - สร้างไฟล์ `src/types/report.types.ts` พร้อม interfaces ทั้งหมด: `ReportFilters`, `ReportOptions`, `ReportResult`, `ReportProductRow`, `InventoryReportData`, `CategoryReportData`, `CategoryGroup`, `LowStockReportData`, `StockValueReportData`, `StockValueProductRow`
    - _Requirements: 1.1, 1.3, 2.1, 3.1, 4.1_

  - [ ] 1.2 สร้าง validator สำหรับ request รายงาน
    - สร้างไฟล์ `src/validators/report.validator.ts` พร้อม express-validator chains สำหรับแต่ละ endpoint
    - ตรวจสอบ query param `format` (ต้องเป็น `pdf` หรือ `xlsx`)
    - ตรวจสอบ `category` เป็น optional string
    - ตรวจสอบ `status` เป็น optional enum (`active` | `inactive`)
    - ตรวจสอบ `threshold` เป็น optional integer ระหว่าง 1 ถึง 999999 สำหรับรายงาน low-stock
    - export validation arrays: `inventoryReportValidation`, `categoryReportValidation`, `lowStockReportValidation`, `stockValueReportValidation`
    - _Requirements: 8.3, 8.4, 8.6, 3.3_

  - [ ] 1.3 ติดตั้ง dependencies สำหรับ pdfkit และ exceljs
    - เพิ่ม `pdfkit` และ `exceljs` ใน production dependencies
    - เพิ่ม `@types/pdfkit` ใน devDependencies
    - _Requirements: 5.1, 6.1_

- [ ] 2. พัฒนา ReportService (ชั้นดึงข้อมูล)
  - [ ] 2.1 สร้าง ReportService พร้อม query ข้อมูล inventory
    - สร้างไฟล์ `src/services/report.service.ts`
    - พัฒนา method `getInventoryData(filters: ReportFilters)` สำหรับ query สินค้าพร้อม filter category/status (optional) เรียงตาม category ASC แล้วตาม name ASC
    - ใส่ metadata ของรายงาน: title, generatedAt (UTC YYYY-MM-DD HH:mm), totalCount
    - กำหนด mssql request timeout เป็น 30 วินาที
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

  - [ ] 2.2 เพิ่ม query ข้อมูลรายงาน category
    - พัฒนา method `getCategoryData(filters: ReportFilters)`
    - Query สินค้า LEFT JOIN categories จัดกลุ่มตาม category
    - คำนวณยอดรวมย่อย: productCount และ totalStockValue ต่อ category
    - เรียง categories ตามตัวอักษร, สินค้าในแต่ละกลุ่มเรียงตาม name ASC
    - จัดกลุ่มสินค้าที่ไม่มี category ไว้ใน "Uncategorized" ท้ายสุด
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 2.3 เพิ่ม query ข้อมูลรายงาน low stock
    - พัฒนา method `getLowStockData(threshold: number)`
    - ค่า threshold เริ่มต้นเป็น 10 หากไม่ได้ระบุ
    - Query สินค้าที่ quantity <= threshold เรียงตาม quantity ASC
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 2.4 เพิ่ม query ข้อมูลรายงานมูลค่าสต็อก
    - พัฒนา method `getStockValueData(filters: ReportFilters)`
    - คำนวณ stockValue = quantity × unitPrice ต่อสินค้า
    - เรียงตาม stockValue DESC
    - สร้าง summary: totalProducts, totalQuantity, totalStockValue
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 2.5 เพิ่ม method `generateReport` สำหรับประสานงาน
    - พัฒนา `generateReport(options: ReportOptions): Promise<ReportResult>` ที่เรียก query และ generator ตาม options.type และ options.format
    - ครอบการ generate ด้วย Promise.race กำหนด timeout 30 วินาที
    - คืนค่า buffer, filename, และ contentType
    - _Requirements: 8.5, 1.6_

  - [ ]* 2.6 เขียน property tests สำหรับ logic ข้อมูลของ ReportService
    - **Property 1: ความถูกต้องของ filter** — ตรวจสอบ AND logic สำหรับ filter category/status
    - **Property 2: ลำดับการเรียงของรายงาน inventory** — ตรวจสอบการเรียง category ASC, name ASC
    - **Property 6: การกรองตาม threshold** — ตรวจสอบว่าสินค้าทุกตัวที่ quantity ≤ T ถูกรวม, ที่เหลือถูกตัดออก
    - **Property 7: ลำดับการเรียงของรายงาน low stock** — ตรวจสอบลำดับ quantity จากน้อยไปมาก
    - **Validates: Requirements 1.1, 1.2, 2.4, 3.1, 3.4, 4.3**

- [ ] 3. Checkpoint - ตรวจสอบว่า tests ทั้งหมดผ่าน
  - ตรวจสอบว่า tests ทั้งหมดผ่าน หากมีข้อสงสัยให้สอบถามผู้ใช้

- [ ] 4. พัฒนา PdfReportGenerator
  - [ ] 4.1 สร้าง PdfReportGenerator พร้อม method รายงาน inventory
    - สร้างไฟล์ `src/services/pdf-report.generator.ts`
    - ใช้ `pdfkit` สร้าง PDF ขนาด A4 (210×297mm) พร้อม margins ≥15mm
    - แสดงส่วนหัวรายงาน: title, generatedAt, totalCount
    - แสดงตารางพร้อมคอลัมน์: SKU, Name, Category, Quantity, Unit Price, Status
    - ใช้ font sans-serif ขนาด 10–12pt สำหรับเนื้อหา, ตัวหนาสำหรับหัวตาราง
    - เพิ่มเลขหน้า "Page X of Y" กลาง footer
    - แบ่งหน้าพร้อมทำหัวคอลัมน์ซ้ำบนหน้าใหม่
    - จัดการกรณีข้อมูลว่าง: แสดงส่วนหัว + ข้อความ "No products found"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 1.3, 1.4, 1.5_

  - [ ] 4.2 เพิ่มการสร้าง PDF สำหรับรายงาน category
    - แสดงแต่ละ category เป็นหัวข้อย่อยพร้อมรายการสินค้าด้านล่าง
    - ใส่แถวยอดรวมย่อยต่อ category (productCount, totalStockValue)
    - จัดการส่วน "Uncategorized" ท้ายสุด
    - _Requirements: 2.2, 2.3, 2.5, 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.3 เพิ่มการสร้าง PDF สำหรับรายงาน low stock
    - แสดงสินค้า low stock เรียงตาม quantity ASC
    - ใช้สีแดงสำหรับสินค้าที่มี quantity = 0
    - จัดการกรณีผลลัพธ์ว่างพร้อมข้อความแจ้ง
    - _Requirements: 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.4 เพิ่มการสร้าง PDF สำหรับรายงานมูลค่าสต็อก
    - แสดงสินค้าพร้อมคอลัมน์ stockValue เรียงตาม stockValue DESC
    - ใส่แถว grand total ด้านล่าง
    - ใส่ส่วน summary: totalProducts, totalQuantity, totalStockValue
    - จัดการกรณีผลลัพธ์ว่างพร้อม summary เป็นศูนย์
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.5 เขียน unit tests สำหรับ PdfReportGenerator
    - ทดสอบขนาดหน้า A4 และ margins
    - ทดสอบรูปแบบเลขหน้า "Page X of Y"
    - ทดสอบกรณีข้อมูลว่างให้สร้าง PDF ที่ถูกต้องพร้อมส่วนหัว
    - ทดสอบข้อความสีแดงสำหรับสินค้า quantity เป็นศูนย์ในรายงาน low stock
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 3.5_

- [ ] 5. พัฒนา ExcelReportGenerator
  - [ ] 5.1 สร้าง ExcelReportGenerator พร้อม method รายงาน inventory
    - สร้างไฟล์ `src/services/excel-report.generator.ts`
    - ใช้ `exceljs` สร้าง workbook XLSX
    - จัดรูปแบบแถวแรกเป็นหัวคอลัมน์ตัวหนา
    - ปรับความกว้างคอลัมน์อัตโนมัติ (ต่ำสุด 8, สูงสุด 50 ตัวอักษร)
    - จัดรูปแบบ quantity เป็นจำนวนเต็มพร้อมเครื่องหมายจุลภาค
    - จัดรูปแบบ currency (unitPrice) เป็นทศนิยม 2 ตำแหน่งพร้อมเครื่องหมายจุลภาค
    - รูปแบบชื่อไฟล์: `inventory_{YYYY-MM-DD}.xlsx`
    - จัดการกรณีข้อมูลว่างแสดงเฉพาะหัวคอลัมน์
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 1.3, 1.5_

  - [ ] 5.2 เพิ่มการสร้าง Excel สำหรับรายงาน category
    - จัดรูปแบบพร้อมหัวข้อย่อย category
    - ใส่แถวยอดรวมย่อยพร้อม productCount และ totalStockValue
    - ชื่อไฟล์: `category_{YYYY-MM-DD}.xlsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 2.2, 2.3_

  - [ ] 5.3 เพิ่มการสร้าง Excel สำหรับรายงาน low stock
    - ใช้พื้นหลัง cell สีแดงสำหรับแถวสินค้าที่ quantity เป็นศูนย์
    - ชื่อไฟล์: `low-stock_{YYYY-MM-DD}.xlsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 3.5_

  - [ ] 5.4 เพิ่มการสร้าง Excel สำหรับรายงานมูลค่าสต็อก
    - ใส่คอลัมน์ stockValue จัดรูปแบบเป็น currency
    - ใส่ส่วน summary ด้านล่าง
    - ชื่อไฟล์: `stock-value_{YYYY-MM-DD}.xlsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 4.2, 4.4_

  - [ ]* 5.5 เขียน property tests สำหรับรูปแบบตัวเลข Excel และชื่อไฟล์
    - **Property 9: รูปแบบชื่อไฟล์ export** — ตรวจสอบชื่อไฟล์ตรงตามรูปแบบ `{report_type}_{YYYY-MM-DD}.xlsx`
    - **Property 10: รูปแบบตัวเลขใน Excel** — ตรวจสอบ quantity เป็นจำนวนเต็มพร้อม comma, currency มีทศนิยม 2 ตำแหน่ง
    - **Validates: Requirements 6.1, 6.4**

  - [ ]* 5.6 เขียน property tests สำหรับการจัดกลุ่ม category และการคำนวณมูลค่าสต็อก
    - **Property 4: การจัดกลุ่มและลำดับ category** — ตรวจสอบการจัดกลุ่มถูกต้อง, categories เรียงตามตัวอักษร, สินค้าในกลุ่มเรียงตาม name
    - **Property 5: การคำนวณยอดรวมย่อย category** — ตรวจสอบ productCount และ totalStockValue ต่อกลุ่ม
    - **Property 8: ความถูกต้องการคำนวณมูลค่าสต็อกและ summary** — ตรวจสอบ stockValue = quantity × unitPrice, เรียง descending, และ summary ถูกต้อง
    - **Validates: Requirements 2.1, 2.2, 2.3, 4.1, 4.2, 4.4**

- [ ] 6. Checkpoint - ตรวจสอบว่า tests ทั้งหมดผ่าน
  - ตรวจสอบว่า tests ทั้งหมดผ่าน หากมีข้อสงสัยให้สอบถามผู้ใช้

- [ ] 7. พัฒนา ReportController และ routes
  - [ ] 7.1 สร้าง ReportController
    - สร้างไฟล์ `src/controllers/report.controller.ts`
    - พัฒนา static methods: `generateInventoryReport`, `generateCategoryReport`, `generateLowStockReport`, `generateStockValueReport`
    - แปลงและส่ง query params ไปยัง ReportService
    - กรณีสำเร็จ: ตั้งค่า headers Content-Type และ Content-Disposition แล้วส่ง buffer
    - กรณี validation error: คืน 400 พร้อมรายละเอียด error
    - กรณี timeout: คืน 504
    - กรณี generation ล้มเหลว: คืน 500
    - กรณีข้อมูลว่าง: คืนไฟล์ที่ถูกต้อง (200)
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 1.5, 1.6_

  - [ ] 7.2 สร้าง report routes และลงทะเบียนใน app
    - สร้างไฟล์ `src/routes/report.routes.ts` พร้อม routes:
      - `GET /api/reports/inventory` ผ่าน `authenticate` + `inventoryReportValidation`
      - `GET /api/reports/category` ผ่าน `authenticate` + `categoryReportValidation`
      - `GET /api/reports/low-stock` ผ่าน `authenticate` + `lowStockReportValidation`
      - `GET /api/reports/stock-value` ผ่าน `authenticate` + `stockValueReportValidation`
    - ลงทะเบียน routes ในไฟล์ `src/routes/index.ts`
    - _Requirements: 8.1, 8.2_

  - [ ]* 7.3 เขียน integration tests สำหรับ API endpoints ของรายงาน
    - ทดสอบ request ที่ authenticated คืน response binary PDF/XLSX ที่ถูกต้องพร้อม headers ที่เหมาะสม
    - ทดสอบ request ที่ไม่ได้ authenticate คืน 401
    - ทดสอบ format ที่ไม่ถูกต้องคืน 400
    - ทดสอบ threshold ที่ไม่ถูกต้องคืน 400
    - ทดสอบ headers Content-Type และ Content-Disposition
    - _Requirements: 8.2, 8.4, 8.5, 8.6_

  - [ ]* 7.4 เขียน property test สำหรับ metadata ส่วนหัวของรายงาน
    - **Property 3: ความถูกต้องของ metadata ส่วนหัวรายงาน** — ตรวจสอบ totalCount เท่ากับจำนวนแถวสินค้า และ generatedAt ตรงตามรูปแบบ UTC YYYY-MM-DD HH:mm
    - **Validates: Requirements 1.4**

- [ ] 8. พัฒนาหน้า ReportPage ฝั่ง frontend
  - [ ] 8.1 สร้าง service reportApi
    - สร้างไฟล์ `frontend/src/services/reportApi.ts`
    - พัฒนาฟังก์ชัน download สำหรับแต่ละประเภทรายงานที่เรียก GET request พร้อม query params
    - จัดการ response แบบ binary (blob) และเรียกการดาวน์โหลดผ่าน browser
    - ตั้งค่า axios timeout เป็น 30 วินาที
    - _Requirements: 7.6, 7.8_

  - [ ] 8.2 สร้าง component ReportFilters
    - สร้างไฟล์ `frontend/src/components/ReportFilters.tsx`
    - แสดง filter controls ตามเงื่อนไขของประเภทรายงานที่เลือก:
      - Inventory: dropdown category + dropdown status
      - Category: dropdown category
      - Low Stock: input ตัวเลข threshold (ค่าเริ่มต้น: 10)
      - Stock Value: dropdown category
    - ดึงข้อมูล categories จาก category API ที่มีอยู่สำหรับ dropdown
    - _Requirements: 7.2_

  - [ ] 8.3 สร้าง component ExportButtons
    - สร้างไฟล์ `frontend/src/components/ExportButtons.tsx`
    - แสดงปุ่มดาวน์โหลด PDF และ Excel
    - สถานะ disabled เมื่อยังไม่ได้เลือกประเภทรายงาน
    - สถานะ loading พร้อม spinner ระหว่างสร้างรายงาน
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 8.4 สร้าง ReportPage และเชื่อมต่อ components ทั้งหมด
    - สร้างไฟล์ `frontend/src/pages/ReportPage.tsx`
    - เพิ่มตัวเลือกประเภทรายงาน (Inventory, Category, Low Stock, Stock Value)
    - ประกอบ ReportFilters และ ExportButtons เข้าด้วยกัน
    - จัดการเมื่อกดปุ่ม export: เรียก reportApi, เปิดดาวน์โหลดเมื่อสำเร็จ
    - แสดงข้อความ error เมื่อล้มเหลวหรือ timeout
    - เปิดใช้งานปุ่มอีกครั้งหลังเสร็จสิ้น
    - เพิ่ม route สำหรับ ReportPage ใน app router
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 9. Checkpoint สุดท้าย - ตรวจสอบว่า tests ทั้งหมดผ่าน
  - ตรวจสอบว่า tests ทั้งหมดผ่าน หากมีข้อสงสัยให้สอบถามผู้ใช้

## Notes

- Tasks ที่มีเครื่องหมาย `*` เป็น optional สามารถข้ามได้สำหรับ MVP ที่เร็วขึ้น
- แต่ละ task อ้างอิง requirements เฉพาะเพื่อความสามารถในการตรวจสอบย้อนกลับ
- Checkpoints ช่วยให้มั่นใจในการตรวจสอบแบบค่อยเป็นค่อยไป
- Property tests ตรวจสอบคุณสมบัติความถูกต้องสากลจากเอกสาร design
- Unit tests ตรวจสอบตัวอย่างเฉพาะและ edge cases
- Backend ใช้ TypeScript กับ Express, mssql, pdfkit, และ exceljs
- Frontend ใช้ React กับ TypeScript
- `fast-check` ถูกติดตั้งไว้แล้วสำหรับ property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["4.5", "5.5", "5.6"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2"] },
    { "id": 9, "tasks": ["7.3", "7.4", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["8.4"] }
  ]
}
```
