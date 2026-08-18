# Implementation Plan: Expense Summary Report

## Overview

สร้างฟีเจอร์รายงานสรุปค่าใช้จ่ายสินค้าคงคลัง ประกอบด้วย API endpoint ใหม่ (`GET /api/reports/expense-summary`) ฝั่งแบ็กเอนด์ที่รองรับ JSON, PDF, และ Excel response พร้อมตัวกรองวันที่และหมวดหมู่ รวมถึงหน้า React ฝั่งฟรอนต์เอนด์ที่แสดงตาราง, Pie Chart, Bar Chart, ตัวกรอง และปุ่มส่งออก

## Tasks

- [x] 1. สร้างประเภทข้อมูลและ interfaces สำหรับ Expense Summary
  - [x] 1.1 สร้างไฟล์ `backend/src/types/expense-summary.types.ts` กำหนด interfaces: `ExpenseSummaryFilters`, `ExpenseItem`, `CategoryBreakdownItem`, `ExpenseSummary`, `ExpenseSummaryData`, `ExpenseSummaryReportResult`
    - กำหนดประเภทข้อมูลตามที่ระบุในเอกสารออกแบบ
    - Export ประเภทข้อมูลทั้งหมดจาก `backend/src/types/index.ts`
    - _Requirements: 6.2_

  - [x] 1.2 สร้างไฟล์ `frontend/src/types/expense-summary.types.ts` กำหนด interfaces สำหรับฝั่ง frontend: `ExpenseSummaryFilters`, `ExpenseItem`, `CategoryBreakdownItem`, `ExpenseSummary`, `ExpenseSummaryData`, `ExpenseSummaryApiResponse`
    - ให้สอดคล้องกับ JSON response structure ที่ออกแบบไว้
    - _Requirements: 6.2_

- [x] 2. สร้าง Expense Summary Validator
  - [x] 2.1 สร้างไฟล์ `backend/src/validators/expense-summary.validator.ts` กำหนดกฎตรวจสอบ query parameters ด้วย express-validator
    - ตรวจสอบ `startDate`: ต้องระบุ, รูปแบบ YYYY-MM-DD, เป็นวันที่จริง, ≤ endDate
    - ตรวจสอบ `endDate`: ต้องระบุ, รูปแบบ YYYY-MM-DD, เป็นวันที่จริง, ≥ startDate, ช่วงวันที่ ≤ 365 วัน
    - ตรวจสอบ `categories`: ไม่บังคับ, comma-separated, สูงสุด 20 รายการ
    - ตรวจสอบ `format`: ต้องระบุ, ค่าที่รับได้คือ "json" | "pdf" | "xlsx"
    - _Requirements: 6.1, 6.5, 6.6_

  - [ ]* 2.2 เขียน property test สำหรับการตรวจสอบช่วงวันที่
    - **Property 4: การตรวจสอบช่วงวันที่**
    - **Validates: Requirements 2.1, 2.3, 6.5**

  - [ ]* 2.3 เขียน property test สำหรับการตรวจสอบ API parameters
    - **Property 10: ความถูกต้องของการตรวจสอบ API parameters**
    - **Validates: Requirements 6.1, 6.5, 6.6**

- [x] 3. สร้าง Expense Summary Service
  - [x] 3.1 สร้างไฟล์ `backend/src/services/expense-summary.service.ts` implement class `ExpenseSummaryService`
    - Implement method `getExpenseSummaryData(filters)`: query products จาก MSSQL ตาม date range และ categories, คำนวณ summary (totalAmount, totalItems, totalCategories), สร้าง categoryBreakdown, เรียงลำดับ items ตาม totalValue จากมากไปน้อย
    - Implement method `generatePdfReport(data)`: สร้างไฟล์ PDF โดยใช้ PdfKit ตาม pattern ที่มีอยู่ใน `pdf-report.generator.ts`
    - Implement method `generateExcelReport(data)`: สร้างไฟล์ Excel โดยใช้ ExcelJS ตาม pattern ที่มีอยู่ใน `excel-report.generator.ts`
    - ใช้ timeout 30 วินาทีด้วย `Promise.race` pattern ตาม `ReportService` ที่มีอยู่
    - ตั้งชื่อไฟล์ในรูปแบบ `expense-summary_YYYY-MM-DD.pdf|xlsx` (UTC date)
    - _Requirements: 6.2, 6.3, 6.7, 6.8, 5.4_

  - [ ]* 3.2 เขียน property test สำหรับความถูกต้องของการคำนวณสรุปรวม
    - **Property 1: ความถูกต้องของการคำนวณสรุปรวม**
    - **Validates: Requirements 1.1, 6.8, 7.2**

  - [ ]* 3.3 เขียน property test สำหรับการคำนวณ totalValue ของรายการ
    - **Property 2: การคำนวณ totalValue ของรายการ**
    - **Validates: Requirements 1.2**

  - [ ]* 3.4 เขียน property test สำหรับการเรียงลำดับรายการ
    - **Property 3: การเรียงลำดับรายการตาม totalValue จากมากไปน้อย**
    - **Validates: Requirements 1.3**

  - [ ]* 3.5 เขียน property test สำหรับตัวกรองรวม
    - **Property 5: ตัวกรองรวมส่งคืนเฉพาะรายการที่ตรงกัน**
    - **Validates: Requirements 2.2, 3.2, 3.5**

  - [ ]* 3.6 เขียน property test สำหรับความถูกต้องของรูปแบบชื่อไฟล์
    - **Property 9: ความถูกต้องของรูปแบบชื่อไฟล์**
    - **Validates: Requirements 5.4**

- [x] 4. สร้าง Expense Summary Controller และ Route
  - [x] 4.1 สร้างไฟล์ `backend/src/controllers/expense-summary.controller.ts` implement class `ExpenseSummaryController`
    - Implement static method `getExpenseSummary(req, res, next)` ตรวจสอบ validation errors, จัดการ format=json ส่ง JSON response, จัดการ format=pdf|xlsx ส่ง file download พร้อม headers ที่ถูกต้อง
    - จัดการ error cases: validation error (400), timeout (504), internal error (500)
    - ตาม pattern ที่มีอยู่ใน `report.controller.ts`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.2 เพิ่ม route ใหม่ใน `backend/src/routes/report.routes.ts`
    - เพิ่ม `router.get('/expense-summary', expenseSummaryValidation, ExpenseSummaryController.getExpenseSummary)`
    - Import validator และ controller ที่สร้างใหม่
    - _Requirements: 6.1_

- [ ] 5. Checkpoint - ตรวจสอบ Backend API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. สร้าง Frontend API Service
  - [x] 6.1 สร้างไฟล์ `frontend/src/services/expenseSummaryApi.ts`
    - Implement function สำหรับเรียก `GET /api/reports/expense-summary` ด้วย axios
    - รองรับ query parameters: startDate, endDate, categories, format
    - จัดการ response สำหรับ JSON data (format=json)
    - จัดการ response สำหรับ file download (format=pdf|xlsx) ด้วย `responseType: 'blob'`
    - กำหนด timeout: 5 วินาทีสำหรับ JSON, 30 วินาทีสำหรับ export
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. สร้าง useExpenseSummary Hook
  - [x] 7.1 สร้างไฟล์ `frontend/src/hooks/useExpenseSummary.ts`
    - จัดการ state: data, loading, error, exporting, filters (startDate, endDate, categories)
    - ค่าเริ่มต้น date range: เดือนปัจจุบัน (วันที่ 1 ถึงวันสุดท้ายของเดือน)
    - Implement `fetchData()`: เรียก API พร้อม current filters, อัพเดต state
    - Implement `setDateRange()`: อัพเดต date range filter และเรียก fetchData
    - Implement `setCategories()`: อัพเดต category filter และเรียก fetchData
    - Implement `exportPdf()` / `exportExcel()`: เรียก API ด้วย format=pdf|xlsx, trigger download, จัดการ timeout 30 วินาที
    - จัดการ error states: แสดงข้อความตามประเภท error (401 redirect, 504 timeout, 500 internal)
    - ยกเลิก request ที่ค้างอยู่เมื่อ filters เปลี่ยน (AbortController)
    - _Requirements: 1.4, 1.6, 2.2, 2.5, 5.2, 5.3, 5.5, 5.6, 5.7_

- [x] 8. สร้าง DateRangeFilter Component
  - [x] 8.1 สร้างไฟล์ `frontend/src/components/expense-summary/DateRangeFilter.tsx`
    - ช่องเลือกวันที่เริ่มต้นและวันที่สิ้นสุด (แสดง DD/MM/YYYY)
    - ปุ่มลัดช่วงเวลา: วันนี้, สัปดาห์นี้, เดือนนี้, 3 เดือนล่าสุด, ปีนี้
    - Validation: start ≤ end, ย้อนหลังสูงสุด 5 ปี, ไม่อนุญาตวันที่ในอนาคต
    - แสดงข้อความแจ้งเตือนเมื่อวันที่ไม่ถูกต้อง
    - รองรับ disabled state ระหว่าง loading
    - ใช้ TailwindCSS สำหรับ styling
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 9. สร้าง CategoryMultiSelect Component
  - [x] 9.1 สร้างไฟล์ `frontend/src/components/expense-summary/CategoryMultiSelect.tsx`
    - Multi-select dropdown แสดงลำดับชั้น parent-child ด้วยการย่อหน้า
    - ดึงรายการหมวดหมู่ที่ active จาก API เมื่อ mount
    - แสดง badge จำนวนหมวดหมู่ที่เลือก
    - ปุ่มล้างตัวกรองทั้งหมด
    - รองรับ disabled state ระหว่าง loading
    - ใช้ TailwindCSS สำหรับ styling
    - _Requirements: 3.1, 3.3, 3.4, 3.7_

- [x] 10. สร้าง ExpenseTable Component
  - [x] 10.1 สร้างไฟล์ `frontend/src/components/expense-summary/ExpenseTable.tsx`
    - แสดงตารางคอลัมน์: ชื่อสินค้า, SKU, หมวดหมู่, จำนวน, ราคาต่อหน่วย (ทศนิยม 2), มูลค่ารวม (ทศนิยม 2)
    - เรียงลำดับตามมูลค่ารวมจากมากไปน้อย
    - แสดงสถานะ loading (skeleton/spinner)
    - แสดงข้อความ empty state เมื่อไม่มีข้อมูล
    - ใช้ TailwindCSS สำหรับ styling
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 11. สร้าง Chart Components
  - [x] 11.1 สร้างไฟล์ `frontend/src/components/expense-summary/ExpensePieChart.tsx`
    - ใช้ Recharts PieChart แสดง 10 หมวดหมู่สูงสุด + กลุ่ม "อื่นๆ"
    - Tooltip: ชื่อหมวดหมู่, มูลค่า (ทศนิยม 2), เปอร์เซ็นต์ (ทศนิยม 1)
    - แสดงสถานะ empty: "ไม่มีข้อมูลสำหรับแสดงกราฟ"
    - _Requirements: 4.1, 4.3, 4.5, 4.6, 7.3_

  - [x] 11.2 สร้างไฟล์ `frontend/src/components/expense-summary/ExpenseBarChart.tsx`
    - ใช้ Recharts BarChart แกน X = หมวดหมู่, แกน Y = มูลค่า (฿), เรียงจากมากไปน้อย
    - Tooltip: ชื่อหมวดหมู่, มูลค่า (ทศนิยม 2), เปอร์เซ็นต์ (ทศนิยม 1)
    - แสดงสถานะ empty: "ไม่มีข้อมูลสำหรับแสดงกราฟ"
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 7.3_

  - [ ]* 11.3 เขียน property test สำหรับการจัดกลุ่ม Pie Chart 10 อันดับแรก (สร้างเป็น utility function)
    - **Property 6: การจัดกลุ่ม Pie Chart 10 อันดับแรกคงมูลค่ารวม**
    - **Validates: Requirements 4.1**

  - [ ]* 11.4 เขียน property test สำหรับการเรียงลำดับหมวดหมู่ใน Bar Chart
    - **Property 7: การเรียงลำดับหมวดหมู่ใน Bar Chart**
    - **Validates: Requirements 4.2**

  - [ ]* 11.5 เขียน property test สำหรับความแม่นยำของการคำนวณเปอร์เซ็นต์
    - **Property 8: ความแม่นยำของการคำนวณเปอร์เซ็นต์**
    - **Validates: Requirements 4.5**

- [x] 12. สร้าง ExportButtons Component
  - [x] 12.1 สร้างไฟล์ `frontend/src/components/expense-summary/ExportButtons.tsx`
    - ปุ่มส่งออก PDF และปุ่มส่งออก Excel แยกกัน
    - แสดงสถานะ loading บนปุ่มที่กด และปิดการใช้งานทุกปุ่มระหว่างส่งออก
    - ปิดการใช้งานเมื่อไม่มีข้อมูล (hasData=false)
    - _Requirements: 5.1, 5.5, 5.8_

- [x] 13. สร้าง ExpenseSummaryPage
  - [x] 13.1 สร้างไฟล์ `frontend/src/pages/ExpenseSummaryPage.tsx`
    - ประกอบ components ทั้งหมด: Summary cards, DateRangeFilter, CategoryMultiSelect, ExpenseTable, ExpensePieChart, ExpenseBarChart, ExportButtons
    - แสดง Summary cards: มูลค่ารวม (ทศนิยม 2), จำนวนรายการ, จำนวนหมวดหมู่
    - จัดการ states: loading, error (พร้อมปุ่มลองใหม่), empty
    - ใช้ TailwindCSS layout (responsive grid)
    - _Requirements: 1.1, 1.5, 1.6, 7.1, 7.2_

  - [x] 13.2 เพิ่ม route ใน `frontend/src/App.tsx`
    - เพิ่ม route `/expense-summary` ชี้ไปยัง `ExpenseSummaryPage`
    - ครอบด้วย `ProtectedRoute` สำหรับ authentication
    - _Requirements: 1.1_

  - [x] 13.3 เพิ่มลิงก์เมนูไปยังหน้า Expense Summary ใน Layout/Navigation
    - เพิ่มรายการเมนูสำหรับเข้าถึงหน้ารายงานสรุปค่าใช้จ่าย
    - _Requirements: 1.1_

- [ ] 14. Checkpoint - ตรวจสอบ Frontend Integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 15. เขียน Integration Tests
  - [ ]* 15.1 เขียน integration tests สำหรับ API endpoint `GET /api/reports/expense-summary`
    - ทดสอบ success case: format=json ส่ง JSON response ที่ถูกต้อง
    - ทดสอบ success case: format=pdf ส่ง file download พร้อม correct headers
    - ทดสอบ success case: format=xlsx ส่ง file download พร้อม correct headers
    - ทดสอบ validation errors: missing/invalid parameters → 400
    - ทดสอบ authentication: no token → 401
    - ทดสอบ date range filters และ category filters
    - ทดสอบ empty data response
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

- [ ] 16. Final Checkpoint - ตรวจสอบ Build สำเร็จ
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- โปรเจคใช้ `fast-check` สำหรับ property-based testing และ `jest` สำหรับ unit/integration testing (backend)
- Frontend ใช้ Recharts สำหรับกราฟ, TailwindCSS สำหรับ styling, และ axios สำหรับ API calls
- ตาม pattern ที่มีอยู่: controller → service → database (backend), page → hook → api service (frontend)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "4.1"] },
    { "id": 4, "tasks": ["4.2", "7.1"] },
    { "id": 5, "tasks": ["8.1", "9.1", "10.1", "11.1", "11.2", "12.1"] },
    { "id": 6, "tasks": ["11.3", "11.4", "11.5", "13.1"] },
    { "id": 7, "tasks": ["13.2", "13.3"] },
    { "id": 8, "tasks": ["15.1"] }
  ]
}
```
