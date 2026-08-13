# Implementation Plan: ระบบจัดการ SKU (SKU Management)

## Overview

พัฒนาระบบจัดการ SKU สำหรับระบบบริหารจัดการคลังสินค้า ครอบคลุม Backend API (Express/TypeScript/MSSQL) และ Frontend UI (React/Vite/TailwindCSS) รองรับการสร้าง-อ่าน-แก้ไข-ลบ (CRUD), สร้าง SKU อัตโนมัติตามหมวดหมู่, การค้นหาและแบ่งหน้า, การจัดการสถานะ active/inactive และการตรวจสอบสิทธิ์การเข้าถึง

## Tasks

- [ ] 1. จัดเตรียมโครงสร้างพื้นฐาน Backend สำหรับ SKU
  - [ ] 1.1 สร้าง TypeScript interfaces และ DTOs สำหรับ SKU
    - สร้าง `CreateSkuDto`, `UpdateSkuDto`, `SkuQueryDto` interfaces ในไฟล์ `backend/src/types/dto.ts`
    - เพิ่มค่าคงที่สำหรับ mapping หมวดหมู่ภาษาไทยไปเป็นรหัส 4 ตัวอักษร (เช่น อิเล็กทรอนิกส์ → ELEC)
    - เพิ่ม type `PaginatedResponse` หากยังไม่มี
    - _Requirements: 1.1, 2.2, 3.4_

  - [ ] 1.2 สร้าง SKU validator
    - สร้างไฟล์ `backend/src/validators/sku.validator.ts` โดยใช้ express-validator chains
    - สร้าง `createSkuValidation`: ตรวจสอบ name (1-200 ตัวอักษร), sku (ไม่บังคับ, 1-50 ตัวอักษร, เฉพาะ [a-zA-Z0-9_-]), category (1-100 ตัวอักษร), quantity (0-999999), unitPrice (0-999999999.99, ทศนิยมไม่เกิน 2 ตำแหน่ง), description (ไม่บังคับ, 0-1000 ตัวอักษร)
    - สร้าง `updateSkuValidation`: ทุกฟิลด์เป็น optional แต่มีข้อจำกัดเดียวกัน
    - สร้าง `updateStatusValidation`: status ต้องเป็น "active" หรือ "inactive" เท่านั้น
    - สร้าง `skuListValidation`: page (ขั้นต่ำ 1), limit (1-100), search (optional string)
    - สร้าง `skuIdValidation`: id ต้องเป็น UUID ที่ถูกต้อง
    - สร้าง `generateSkuValidation`: category บังคับ (1-100 ตัวอักษร)
    - Export validators ทั้งหมดจาก `backend/src/validators/index.ts`
    - _Requirements: 1.3, 1.4, 7.3_

  - [ ] 1.3 สร้าง SKU service
    - สร้างไฟล์ `backend/src/services/sku.service.ts` ที่มี class `SkuService`
    - สร้างเมธอด `findAll(query: SkuQueryDto)`: ค้นหาแบบแบ่งหน้าพร้อม search (partial match จากฟิลด์ name, sku, category) เรียงลำดับจาก created_at DESC
    - สร้างเมธอด `findById(id)`: คืนข้อมูลสินค้า หรือ throw NotFoundError ถ้าไม่พบ
    - สร้างเมธอด `create(data: CreateSkuDto)`: ถ้าไม่ระบุ sku ให้เรียก `generateSku(category)`, ตรวจสอบความซ้ำ (throw ConflictError ถ้าซ้ำ), insert ลงตาราง products โดยกำหนด status เป็น "active"
    - สร้างเมธอด `update(id, data: UpdateSkuDto)`: ตรวจสอบว่ามีอยู่ (404), ตรวจสอบ SKU ไม่ซ้ำถ้ามีการเปลี่ยน (409), อัปเดตเฉพาะฟิลด์ที่ส่งมา, อัปเดต `updated_at`
    - สร้างเมธอด `updateStatus(id, status)`: ตรวจสอบว่ามีอยู่ (404), อัปเดตฟิลด์ status
    - สร้างเมธอด `delete(id)`: ตรวจสอบว่ามีอยู่ (404), ลบออกจากฐานข้อมูล
    - สร้างเมธอด `generateSku(category)`: แมปหมวดหมู่เป็นรหัส (fallback เป็น MISC), ค้นหา SKU ตัวเลขสูงสุดที่มีอยู่ในหมวดเดียวกัน, คืนค่า `{CODE}-{next.padStart(5,'0')}`
    - Export จาก `backend/src/services/index.ts`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2_

  - [ ] 1.4 สร้าง SKU controller
    - สร้างไฟล์ `backend/src/controllers/sku.controller.ts` ที่มี class `SkuController`
    - สร้าง static methods: `findAll`, `findById`, `create`, `update`, `updateStatus`, `delete`, `generatePreview`
    - แต่ละเมธอดเรียกใช้ SkuService แล้วจัดรูปแบบ response เป็น `{ success: true, data: ... }` หรือ `{ success: true, data, pagination }`
    - ส่ง errors ไปยัง `next()` เพื่อให้ error middleware จัดการ
    - Export จาก `backend/src/controllers/index.ts`
    - _Requirements: 1.1, 3.4, 6.1_

  - [ ] 1.5 สร้าง SKU routes และลงทะเบียนในแอปพลิเคชัน
    - สร้างไฟล์ `backend/src/routes/sku.routes.ts` กำหนด endpoints ทั้งหมดที่ mount ที่ `/api/skus`
    - ใช้ `authenticate` middleware กับทุก route
    - เชื่อมต่อ validators → controller สำหรับแต่ละ route: GET /, GET /:id, POST /, PUT /:id, PATCH /:id/status, DELETE /:id, POST /generate
    - ลงทะเบียน SKU routes ใน `backend/src/routes/index.ts`
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 2. จุดตรวจสอบ - ตรวจยืนยัน Backend API
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. พัฒนาระบบสร้าง SKU อัตโนมัติและทดสอบ
  - [ ] 3.1 สร้าง endpoint สำหรับ preview SKU อัตโนมัติ
    - ตรวจสอบว่า POST `/api/skus/generate` รับ `{ category }` และคืน `{ success: true, data: { sku: "ELEC-00001" } }` โดยไม่สร้างสินค้าจริง
    - ทดสอบกรณี: SKU แรกในหมวดหมู่เริ่มต้นที่ 00001
    - ทดสอบกรณี: หมวดหมู่ที่ไม่รู้จัก fallback เป็น MISC
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 3.2 เขียน property test: ความถูกต้องของรูปแบบ SKU ที่สร้างอัตโนมัติ
    - **Property 4: Auto-generated SKU format correctness**
    - สำหรับทุกหมวดหมู่ที่รองรับ ตรวจสอบว่า SKU ที่สร้างตรงตามรูปแบบ `{CATEGORY_CODE}-{5_DIGIT_NUMBER}` โดยตัวเลขเพิ่มขึ้นตามลำดับ
    - **Validates: Requirements 2.1**

  - [ ]* 3.3 เขียน property test: หมวดหมู่ที่ไม่รู้จัก fallback เป็น MISC
    - **Property 5: Unknown category falls back to MISC**
    - สำหรับทุกหมวดหมู่ที่ไม่อยู่ในตาราง mapping ตรวจสอบว่า SKU ที่สร้างขึ้นต้นด้วย "MISC-"
    - **Validates: Requirements 2.4**

  - [ ]* 3.4 เขียน property test: การ validate SKU ปฏิเสธรูปแบบที่ไม่ถูกต้อง
    - **Property 3: SKU validation rejects invalid formats**
    - สำหรับทุก string ที่มีอักขระไม่ถูกต้อง ความยาวเกิน 50 ตัว หรือเป็นค่าว่าง ตรวจสอบว่าได้รับ HTTP 400
    - **Validates: Requirements 1.3, 1.4**

- [ ] 4. เขียน property tests สำหรับ CRUD operations
  - [ ]* 4.1 เขียน property test: การสร้างและดึงข้อมูลสินค้า (round-trip)
    - **Property 1: Product creation round-trip**
    - สำหรับทุก payload สินค้าที่ถูกต้อง POST แล้ว GET by ID ต้องได้ค่าฟิลด์เหมือนกัน status เป็น "active" และ timestamps ถูกต้อง
    - **Validates: Requirements 1.1, 6.1**

  - [ ]* 4.2 เขียน property test: บังคับความเป็นเอกลักษณ์ของ SKU
    - **Property 2: SKU uniqueness enforcement**
    - สำหรับทุกสินค้าที่สร้างสำเร็จ การสร้าง SKU ซ้ำต้องได้ 409; การแก้ไข SKU ให้ตรงกับที่มีอยู่ต้องได้ 409
    - **Validates: Requirements 1.2, 4.2**

  - [ ]* 4.3 เขียน property test: ความสอดคล้องของข้อมูล pagination
    - **Property 6: Pagination metadata consistency**
    - สำหรับทุกค่า page/limit ที่ถูกต้อง ตรวจสอบว่า totalPages == ceil(total/limit), data.length <= limit, page ตรงกับที่ร้องขอ
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 4.4 เขียน property test: ความถูกต้องของการกรองจากการค้นหา
    - **Property 7: Search filter correctness**
    - สำหรับทุกคำค้น ผลลัพธ์ทั้งหมดต้องมีคำค้นนั้นในฟิลด์ name, sku หรือ category (case-insensitive)
    - **Validates: Requirements 3.2**

  - [ ]* 4.5 เขียน property test: การแก้ไขบางส่วนคงฟิลด์ที่ไม่ได้แก้ไว้เดิม
    - **Property 8: Partial update preserves unmodified fields**
    - สำหรับทุก subset ของฟิลด์ที่แก้ไขได้ หลัง PUT เฉพาะฟิลด์ที่ระบุและ updatedAt เท่านั้นที่เปลี่ยน
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 4.6 เขียน property test: การลบจะลบสินค้าถาวร
    - **Property 9: Delete removes product permanently**
    - สำหรับทุกสินค้าที่มีอยู่ DELETE แล้ว GET by ID ต้องได้ 404
    - **Validates: Requirements 5.1**

  - [ ]* 4.7 เขียน property test: การเปลี่ยนสถานะบันทึกค่าที่ถูกต้อง
    - **Property 10: Status toggle persists valid values**
    - สำหรับทุกสถานะที่ถูกต้อง ("active"/"inactive") อัปเดตแล้ว GET ต้องได้สถานะที่อัปเดต
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 4.8 เขียน property test: ปฏิเสธสถานะที่ไม่ถูกต้อง
    - **Property 11: Invalid status rejected**
    - สำหรับทุก string ที่ไม่ใช่ "active" หรือ "inactive" การอัปเดตสถานะต้องได้ 400
    - **Validates: Requirements 7.3**

  - [ ]* 4.9 เขียน property test: ปฏิเสธการเข้าถึงที่ไม่ผ่านการยืนยันตัวตน
    - **Property 12: Unauthenticated access rejected**
    - สำหรับทุก endpoint คำขอที่ไม่มี Bearer token ที่ถูกต้องต้องได้ 401
    - **Validates: Requirements 9.1, 9.2**

- [ ] 5. จุดตรวจสอบ - ตรวจยืนยันการทดสอบ Backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. พัฒนา Frontend SKU API service
  - [ ] 6.1 สร้าง SKU API service สำหรับ Frontend
    - สร้างไฟล์ `frontend/src/services/skuApi.ts`
    - สร้างฟังก์ชัน: `getSkus(params)`, `getSkuById(id)`, `createSku(data)`, `updateSku(id, data)`, `updateSkuStatus(id, status)`, `deleteSku(id)`, `generateSkuPreview(category)`
    - ใช้ axios instance ที่มีอยู่แล้วจาก `api.ts` ซึ่งมี auth interceptor
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 7.1_

  - [ ] 6.2 สร้าง TypeScript types สำหรับ SKU ฝั่ง Frontend
    - เพิ่ม types ที่เกี่ยวกับ SKU ในโฟลเดอร์ `frontend/src/types/` (หรือขยาย types ที่มีอยู่): `Sku`, `CreateSkuPayload`, `UpdateSkuPayload`, `SkuListParams`, `PaginatedSkuResponse`
    - _Requirements: 3.4, 6.1_

- [ ] 7. พัฒนา Frontend SKU UI components
  - [ ] 7.1 สร้าง SKU Form Modal component
    - สร้างไฟล์ `frontend/src/components/SKUFormModal.tsx`
    - Modal form มีฟิลด์: name, sku (มี toggle สำหรับเลือกกรอกเอง/สร้างอัตโนมัติ), category (dropdown แสดงหมวดหมู่ภาษาไทย), quantity, unitPrice, description, image
    - เมื่อเลือกสร้างอัตโนมัติ ให้เรียก `generateSkuPreview(category)` เมื่อเปลี่ยนหมวดหมู่ และแสดง preview
    - รองรับทั้งโหมดสร้าง (POST) และโหมดแก้ไข (PUT)
    - แสดง validation errors จาก API response
    - เมื่อสำเร็จ: ปิด modal และ trigger การรีเฟรชรายการ
    - _Requirements: 8.2, 8.3, 8.5, 8.6_

  - [ ] 7.2 สร้าง SKU Delete Confirm Dialog component
    - สร้างไฟล์ `frontend/src/components/SKUDeleteConfirmDialog.tsx`
    - แสดงรหัส SKU และชื่อสินค้าเพื่อยืนยัน
    - ปุ่มยืนยันเรียก `deleteSku(id)`
    - เมื่อสำเร็จ: ปิด dialog และ trigger การรีเฟรชรายการ
    - _Requirements: 5.3, 8.4_

  - [ ] 7.3 สร้างหน้ารายการ SKU
    - สร้างไฟล์ `frontend/src/pages/SKUListPage.tsx`
    - ตารางแสดงคอลัมน์: SKU, ชื่อสินค้า, หมวดหมู่, จำนวน, ราคา, สถานะ (badge active/inactive)
    - ช่องค้นหาพร้อม debounce สำหรับกรองข้อมูล
    - ปุ่มควบคุม pagination (ก่อนหน้า/ถัดไป, เลขหน้า)
    - ปุ่ม "เพิ่ม SKU" เปิด SKUFormModal ในโหมดสร้าง
    - ปุ่มแก้ไขในแต่ละแถว เปิด SKUFormModal ในโหมดแก้ไข
    - ปุ่มลบในแต่ละแถว เปิด SKUDeleteConfirmDialog
    - ปุ่มเปลี่ยนสถานะในแต่ละแถว เรียก updateSkuStatus
    - _Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 7.4 ลงทะเบียนหน้า SKU ในระบบ routing
    - เพิ่ม route สำหรับหน้า SKU ใน `frontend/src/App.tsx` (protected route)
    - เพิ่มลิงก์นำทางไปยังหน้าจัดการ SKU ใน Layout/sidebar
    - _Requirements: 9.3_

- [ ] 8. จุดตรวจสอบสุดท้าย - ตรวจยืนยันการทำงานร่วมกันทั้งระบบ
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- งานที่มีเครื่องหมาย `*` เป็นงานที่ไม่บังคับ (optional) สามารถข้ามได้เพื่อเร่ง MVP
- แต่ละงานอ้างอิง requirements เฉพาะเพื่อให้ตรวจสอบย้อนกลับได้
- จุดตรวจสอบ (checkpoints) ช่วยให้ตรวจยืนยันแบบค่อยเป็นค่อยไป
- Property tests ใช้ fast-check (มีอยู่แล้วใน devDependencies) เพื่อตรวจสอบ correctness properties แบบ universal
- Unit tests ตรวจสอบตัวอย่างเฉพาะและกรณีขอบ (edge cases)
- Design ใช้ตาราง `products` ที่มีอยู่แล้ว ไม่จำเป็นต้อง migrate schema ใหม่
- Backend ใช้ pattern เดิมที่มีอยู่: express-validator, static controller methods, service classes, error middleware
- Frontend ใช้ pattern เดิมที่มีอยู่: axios API services, modal forms, list pages with tables

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["1.4", "6.1", "6.2"] },
    { "id": 3, "tasks": ["1.5", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 5, "tasks": ["7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3"] },
    { "id": 7, "tasks": ["7.4"] }
  ]
}
```
