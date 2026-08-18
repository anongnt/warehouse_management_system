# Implementation Plan: Dashboard

## Overview

พัฒนาฟีเจอร์ Dashboard สำหรับระบบจัดการคลังสินค้า ประกอบด้วย Backend API endpoints (summary, categories, low-stock, recent-products) โดยใช้ Express.js + MS SQL Server และ Frontend UI โดยใช้ React + Tailwind CSS + Recharts การพัฒนาเป็นไปตามรูปแบบที่มีอยู่ในโปรเจกต์ (service layer, controller pattern, JWT auth middleware)

## Tasks

- [ ] 1. กำหนด types ฝั่ง backend และสร้าง DashboardService
  - [ ] 1.1 สร้างไฟล์กำหนด types สำหรับ dashboard
    - สร้างไฟล์ `backend/src/types/dashboard.types.ts` ที่มี interfaces: `DashboardSummary`, `CategoryDistributionItem`, `LowStockProduct`, `RecentProduct`
    - Export types ใหม่จากไฟล์ `backend/src/types/index.ts`
    - _Requirements: 1.1, 2.4, 3.1, 4.1_

  - [ ] 1.2 พัฒนา DashboardService พร้อม SQL queries
    - สร้างไฟล์ `backend/src/services/dashboard.service.ts` ตามรูปแบบ `ProductService` ที่มีอยู่ (ใช้ `getPool()` + parameterized queries)
    - พัฒนา `getSummary()`: นับจำนวนสินค้า active, คำนวณมูลค่าคลังสินค้า (SUM ของ quantity × unit_price ปัดทศนิยม 2 ตำแหน่ง), นับหมวดหมู่ active, นับสินค้าสต็อกต่ำ (active + quantity ≤ 10)
    - พัฒนา `getCategoryDistribution()`: จัดกลุ่มสินค้า active ตามหมวดหมู่ active, ไม่รวม category_id ที่เป็น null, เรียงตาม productCount DESC แล้วตาม categoryName ASC
    - พัฒนา `getLowStockProducts()`: เลือก TOP 10 สินค้า active ที่มี quantity ≤ 10, เรียงตาม quantity ASC แล้วตาม name ASC
    - พัฒนา `getRecentProducts()`: เลือก TOP 5 สินค้า (ทุกสถานะ), เรียงตาม created_at DESC
    - Export จาก `backend/src/services/index.ts`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 1.3 เขียน property tests สำหรับการคำนวณข้อมูลสรุปของ DashboardService
    - ติดตั้ง `fast-check` เป็น dev dependency
    - **Property 1: ความถูกต้องของการคำนวณข้อมูลสรุป** — สุ่มชุดข้อมูลสินค้า/หมวดหมู่, mock DB pool, ตรวจสอบว่า `totalProducts` เท่ากับจำนวนสินค้า active, `inventoryValue` เท่ากับผลรวมของ (quantity × unit_price) ของสินค้า active ปัดทศนิยม 2 ตำแหน่ง, `totalCategories` เท่ากับจำนวนหมวดหมู่ active, `lowStockCount` เท่ากับจำนวนสินค้า active ที่มี quantity ≤ 10
    - **ตรวจสอบ: Requirements 1.2, 1.3, 1.4, 1.5**

  - [ ]* 1.4 เขียน property tests สำหรับการกระจายสินค้าตามหมวดหมู่
    - **Property 2: ตัวกรองการกระจายสินค้าตามหมวดหมู่** — สุ่มชุดข้อมูลสินค้าและหมวดหมู่, ตรวจสอบว่าผลลัพธ์มีเฉพาะหมวดหมู่ active ที่มีสินค้า active อย่างน้อย 1 รายการ, ไม่รวมสินค้าที่ category_id เป็น null
    - **Property 3: ลำดับการเรียงของการกระจายสินค้า** — ตรวจสอบว่าเรียงตาม productCount DESC แล้วตาม categoryName ASC เมื่อจำนวนเท่ากัน
    - **ตรวจสอบ: Requirements 2.1, 2.2, 2.3**

  - [ ]* 1.5 เขียน property tests สำหรับสินค้าสต็อกต่ำ
    - **Property 4: ตัวกรองและจำกัดจำนวนสินค้าสต็อกต่ำ** — ตรวจสอบว่ามีเฉพาะสินค้า active ที่มี quantity ≤ 10, จำกัดสูงสุด 10 รายการ, เลือก 10 รายการที่ quantity น้อยที่สุดเมื่อมีมากกว่า 10 รายการที่ผ่านเกณฑ์
    - **Property 5: ลำดับการเรียงสินค้าสต็อกต่ำ** — ตรวจสอบว่าเรียงตาม quantity ASC แล้วตาม name ASC เมื่อ quantity เท่ากัน
    - **ตรวจสอบ: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 1.6 เขียน property tests สำหรับสินค้าล่าสุด
    - **Property 6: การเลือกสินค้าล่าสุด** — ตรวจสอบว่ามีไม่เกิน 5 รายการ, เรียงตาม createdAt DESC, รวมสินค้าทุกสถานะ, คืนทั้งหมดที่มีเมื่อมีน้อยกว่า 5 รายการ
    - **ตรวจสอบ: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 2. สร้าง DashboardController และ routes
  - [ ] 2.1 พัฒนา DashboardController
    - สร้างไฟล์ `backend/src/controllers/dashboard.controller.ts` ตามรูปแบบ `ProductController` ที่มีอยู่ (static async methods พร้อม try/catch → next(error))
    - พัฒนา `getSummary`, `getCategoryDistribution`, `getLowStockProducts`, `getRecentProducts` — แต่ละ method เรียก DashboardService method ที่เกี่ยวข้องแล้วคืนค่า `{ success: true, data: ... }`
    - Export จาก `backend/src/controllers/index.ts`
    - _Requirements: 1.1, 1.6, 1.7, 2.5, 3.5, 4.5_

  - [ ] 2.2 สร้าง dashboard routes พร้อม auth middleware
    - สร้างไฟล์ `backend/src/routes/dashboard.routes.ts` — ลงทะเบียน GET endpoints ทั้ง 4 ภายใต้ `/api/dashboard/` โดยใช้ `authenticate` middleware ที่มีอยู่
    - อัปเดตไฟล์ `backend/src/routes/index.ts` เพื่อ mount `dashboardRoutes` ที่ `/dashboard`
    - _Requirements: 7.1_

  - [ ]* 2.3 เขียน unit tests สำหรับ DashboardController
    - Mock DashboardService, ตรวจสอบโครงสร้าง response ของแต่ละ endpoint
    - ตรวจสอบกรณี error: service throw → response 500 ผ่าน error middleware
    - _Requirements: 1.1, 1.6, 1.7_

- [ ] 3. จุดตรวจสอบ - ยืนยัน Backend API
  - ตรวจสอบว่า tests ทั้งหมดฝั่ง backend ผ่าน, สอบถามผู้ใช้หากมีข้อสงสัย

- [ ] 4. สร้าง types ฝั่ง frontend และ dashboard API service
  - [ ] 4.1 กำหนด types สำหรับ dashboard ฝั่ง frontend
    - เพิ่ม interfaces `DashboardSummary`, `CategoryDistributionItem`, `LowStockProduct`, `RecentProduct` ในไฟล์ `frontend/src/types/index.ts` (หรือสร้างไฟล์ `dashboard.ts` แยก)
    - _Requirements: 1.1, 2.4, 3.1, 4.1_

  - [ ] 4.2 สร้าง dashboard API service ฝั่ง frontend
    - สร้างไฟล์ `frontend/src/services/dashboard.service.ts` ที่มีฟังก์ชัน: `fetchSummary()`, `fetchCategoryDistribution()`, `fetchLowStockProducts()`, `fetchRecentProducts()` — แต่ละฟังก์ชันเรียก backend endpoint ที่เกี่ยวข้องผ่าน Axios instance ที่มีอยู่พร้อม auth headers
    - กำหนด timeout 30 วินาทีต่อ request
    - _Requirements: 6.2_

  - [ ] 4.3 สร้าง useDashboard custom hook
    - สร้างไฟล์ `frontend/src/hooks/useDashboard.ts` ตาม interface `UseDashboardReturn` จากเอกสารออกแบบ
    - เรียก API ทั้ง 4 endpoints พร้อมกันเมื่อ component mount
    - จัดการ loading state และ error state แยกอิสระต่อส่วน
    - พัฒนาฟังก์ชัน `retry(section)` สำหรับเรียก API ใหม่เฉพาะส่วนที่ล้มเหลว
    - จัดการ response 401 (อาศัย Axios interceptor ที่มีอยู่สำหรับลบ token และ redirect)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.2_

- [ ] 5. สร้าง UI components สำหรับ dashboard
  - [ ] 5.1 สร้าง component KpiCards
    - สร้างไฟล์ `frontend/src/components/dashboard/KpiCards.tsx` โดยใช้ Tailwind CSS (card layout แบบ grid)
    - แสดง KPI cards 4 ใบ: จำนวนสินค้าทั้งหมด, มูลค่าคลังสินค้า (แสดงเป็น ฿ พร้อมจุลภาคคั่นหลักพันและทศนิยม 2 ตำแหน่ง), จำนวนหมวดหมู่, จำนวนสินค้าสต็อกต่ำ
    - แสดง loading skeleton ขณะกำลังโหลดข้อมูล
    - แสดงค่า "0" เมื่อไม่มีข้อมูล
    - _Requirements: 5.1, 5.2, 5.7, 6.1_

  - [ ]* 5.2 เขียน property test สำหรับการจัดรูปแบบสกุลเงิน
    - **Property 7: การจัดรูปแบบสกุลเงินบาท** — สำหรับตัวเลขที่ไม่ติดลบใดๆ ตรวจสอบว่า formatter สร้างผลลัพธ์ที่มีคำนำหน้า "฿", คั่นหลักพันด้วยจุลภาค, และทศนิยม 2 ตำแหน่งเสมอ
    - **ตรวจสอบ: Requirements 5.2**

  - [ ] 5.3 สร้าง component CategoryChart
    - สร้างไฟล์ `frontend/src/components/dashboard/CategoryChart.tsx` โดยใช้ Recharts PieChart/Cell components
    - แสดงกราฟวงกลม (pie/donut chart) แสดงการกระจายสินค้าตามหมวดหมู่ พร้อม labels (ชื่อหมวดหมู่ + จำนวน)
    - แสดง loading skeleton ขณะกำลังดึงข้อมูล
    - แสดง empty state placeholder เมื่อไม่มีข้อมูล
    - จัดแต่งด้วย Tailwind CSS (wrapper card)
    - _Requirements: 5.3, 5.7, 6.1_

  - [ ] 5.4 สร้าง component LowStockTable
    - สร้างไฟล์ `frontend/src/components/dashboard/LowStockTable.tsx` โดยใช้ Tailwind CSS table
    - แสดงคอลัมน์: ชื่อสินค้า, SKU, จำนวนคงเหลือ, หมวดหมู่
    - แสดง loading skeleton ขณะกำลังโหลด
    - แสดง empty state เมื่อไม่มีสินค้าสต็อกต่ำ
    - _Requirements: 5.4, 5.7, 6.1_

  - [ ] 5.5 สร้าง component RecentProductsTable
    - สร้างไฟล์ `frontend/src/components/dashboard/RecentProductsTable.tsx` โดยใช้ Tailwind CSS table
    - แสดงคอลัมน์: ชื่อสินค้า, SKU, หมวดหมู่, จำนวน, วันที่สร้าง
    - แสดง loading skeleton ขณะกำลังโหลด
    - แสดง empty state เมื่อไม่มีสินค้า
    - _Requirements: 5.5, 5.7, 6.1_

  - [ ] 5.6 สร้าง component ErrorMessage พร้อมปุ่มลองใหม่
    - สร้างไฟล์ `frontend/src/components/dashboard/ErrorMessage.tsx` เป็น component ที่ใช้ซ้ำได้ จัดแต่งด้วย Tailwind CSS
    - แสดงข้อความ error และปุ่มลองใหม่ (retry)
    - จัดการข้อความสำหรับกรณี timeout, network error, และ server error
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 6. ประกอบหน้า DashboardPage และเชื่อมต่อ routing
  - [ ] 6.1 เขียนหน้า DashboardPage ใหม่โดยรวม components ทั้งหมด
    - แทนที่ไฟล์ `frontend/src/pages/DashboardPage.tsx` เดิมด้วย dashboard layout ใหม่
    - ประกอบ components: KpiCards, CategoryChart, LowStockTable, RecentProductsTable
    - ใช้ `useDashboard` hook สำหรับจัดการ data, loading, และ error states
    - แสดงผลแต่ละส่วนแยกอิสระ — ถ้าส่วนใดเกิด error ส่วนอื่นยังแสดงผลได้ตามปกติ
    - ใช้ Tailwind CSS grid/flex สำหรับ responsive layout
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 6.1, 6.3_

  - [ ] 6.2 ติดตั้ง dependency Recharts
    - เพิ่ม `recharts` ใน frontend package.json dependencies
    - _Requirements: 5.3_

  - [ ] 6.3 ตรวจสอบให้ dashboard เป็นหน้าแรกหลัง login
    - ตรวจสอบ/อัปเดต routing ให้หลัง login สำเร็จ ผู้ใช้ถูก navigate ไปหน้า dashboard
    - ตรวจสอบว่า ProtectedRoute redirect ผู้ใช้ที่ไม่ได้ยืนยันตัวตนไปหน้า login โดยไม่เรียก API
    - _Requirements: 7.3, 7.4_

  - [ ]* 6.4 เขียน unit tests สำหรับ UI components ของ dashboard
    - ทดสอบ KpiCards แสดงค่าถูกต้อง รวมถึงสถานะ loading/empty
    - ทดสอบ CategoryChart render ด้วย mock data
    - ทดสอบ LowStockTable และ RecentProductsTable แสดงคอลัมน์ถูกต้อง
    - ทดสอบ ErrorMessage แสดงข้อความและปุ่มลองใหม่ทำงานได้
    - ทดสอบ useDashboard hook จัดการ loading/error/retry ถูกต้อง
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.3, 6.5_

- [ ] 7. จุดตรวจสอบสุดท้าย - ยืนยันการทำงานทั้งระบบ
  - ตรวจสอบว่า tests ทั้งหมดผ่าน, สอบถามผู้ใช้หากมีข้อสงสัย

## Notes

- งานที่มีเครื่องหมาย `*` เป็นงานเสริม (optional) สามารถข้ามได้เพื่อเร่งการพัฒนา MVP
- แต่ละงานอ้างอิง requirements เฉพาะเพื่อให้ตรวจสอบย้อนกลับได้
- Backend ใช้รูปแบบที่มีอยู่: `getPool()` + SQL, static controller methods, `authenticate` middleware
- Frontend ใช้ Tailwind CSS (ไม่ใช้ Ant Design) และ Recharts สำหรับกราฟ
- Property tests ใช้ `fast-check` โดยรันอย่างน้อย 100 รอบต่อ property test
- API endpoints ทั้งหมดต้องผ่านการยืนยันตัวตน JWT ผ่าน `authenticate` middleware ที่มีอยู่
- Axios interceptor ที่มีอยู่จะจัดการ 401 → ลบ token → redirect ไปหน้า login

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "4.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "1.6", "2.1", "4.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "5.1", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 4, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.4"] }
  ]
}
```
