# Implementation Plan: Warehouse Product CRUD

## Overview

พัฒนาระบบ CRUD สำหรับจัดการข้อมูลสินค้าในคลังสินค้าอย่างครบวงจร ประกอบด้วย Backend API (Express/TypeScript/MSSQL), ระบบ validation, business logic และหน้า Frontend UI (React/TailwindCSS) โดยใช้สถาปัตยกรรม Controller → Service → Database ตามรูปแบบที่มีอยู่แล้วในโมดูล User CRUD

## Tasks

- [ ] 1. ตั้งค่าโครงสร้างฐานข้อมูลและ types ของสินค้า
  - [ ] 1.1 สร้าง migration สำหรับตาราง products
    - เพิ่ม migration script เพื่อสร้างตาราง `products` พร้อมคอลัมน์ทั้งหมด (id, name, sku, category, quantity, unit_price, description, status, created_at, updated_at)
    - เพิ่ม UNIQUE constraint บน sku, CHECK constraints บน quantity/unit_price/status
    - สร้าง indexes บน sku, category, status, name และ created_at DESC
    - _Requirements: 1.2, 1.6_

  - [ ] 1.2 กำหนด Product DTOs และ interfaces ใน backend types
    - เพิ่ม `CreateProductDto`, `UpdateProductDto`, `ProductQueryDto`, `ProductResponse` และ `ProductModel` interfaces ใน `backend/src/types/dto.ts` และ `backend/src/types/interfaces.ts`
    - เพิ่ม `IProductService` interface
    - เพิ่ม `PaginatedResponse<T>` generic type หากยังไม่มี
    - _Requirements: 1.2, 1.7, 2.4, 4.2_

- [ ] 2. พัฒนา Product Service และ Controller ฝั่ง Backend
  - [ ] 2.1 พัฒนา Product Service (`backend/src/services/product.service.ts`)
    - พัฒนา `findAll` พร้อมระบบ pagination (page/limit), ค้นหา (case-insensitive partial match บน name/sku/category) และเรียงลำดับตาม created_at DESC
    - พัฒนา `findById` พร้อม UUID validation
    - พัฒนา `create` โดยกำหนด status เริ่มต้นเป็น 'active' และตั้งค่า timestamps เป็นเวลาปัจจุบัน
    - พัฒนา `update` รองรับ partial update, ตรวจสอบ SKU ไม่ซ้ำกับสินค้าอื่น และอัปเดต updated_at timestamp
    - พัฒนา `delete` ลบข้อมูลถาวรจากฐานข้อมูล
    - จัดการ duplicate SKU ด้วย ConflictError (409)
    - จัดการ not found ด้วย NotFoundError (404)
    - Export และลงทะเบียนใน `backend/src/services/index.ts`
    - _Requirements: 1.1, 1.3, 1.5, 1.6, 2.1, 2.3, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

  - [ ]* 2.2 เขียน property test: การสร้างและดึงข้อมูลสินค้ากลับ (Property 1)
    - **Property 1: Product creation round-trip**
    - สร้าง random valid product DTOs และตรวจสอบว่า create + findById คืนค่าฟิลด์ตรงกัน โดย status เป็น 'active'
    - **Validates: Requirements 1.1, 1.6, 1.7, 3.1**

  - [ ]* 2.3 เขียน property test: การบังคับ SKU ไม่ซ้ำ (Property 3)
    - **Property 3: SKU uniqueness enforcement**
    - สร้างคู่สินค้าที่มี SKU เดียวกัน และตรวจสอบว่าได้รับ 409 เมื่อสร้างซ้ำหรืออัปเดต SKU ไปซ้ำกับสินค้าอื่น
    - **Validates: Requirements 1.3, 4.3**

  - [ ]* 2.4 เขียน property test: ความถูกต้องของ pagination metadata (Property 4)
    - **Property 4: Pagination metadata consistency**
    - สร้าง random page/limit/total combinations และตรวจสอบว่า totalPages = Math.ceil(total/limit), items.length ≤ limit และเรียงลำดับจากใหม่ไปเก่า
    - **Validates: Requirements 2.2, 2.4, 2.5**

  - [ ]* 2.5 เขียน property test: ความถูกต้องของตัวกรองการค้นหา (Property 5)
    - **Property 5: Search filter correctness**
    - สร้าง random search strings และชุดข้อมูลสินค้า ตรวจสอบว่าผลลัพธ์ทั้งหมดมี search string อยู่ใน name, sku หรือ category (case-insensitive)
    - **Validates: Requirements 2.3**

  - [ ]* 2.6 เขียน property test: partial update คงค่าฟิลด์ที่ไม่ได้แก้ไข (Property 8)
    - **Property 8: Partial update preserves unmodified fields**
    - สร้าง random field subsets ที่มีค่าถูกต้อง ตรวจสอบว่าเฉพาะฟิลด์ที่ระบุและ updated_at เท่านั้นที่เปลี่ยนแปลง
    - **Validates: Requirements 4.1, 4.2, 4.5**

  - [ ]* 2.7 เขียน property test: การลบสินค้าอย่างถาวร (Property 9)
    - **Property 9: Delete removes product permanently**
    - สร้างสินค้า ลบออก แล้วตรวจสอบว่า findById คืนค่า null/404
    - **Validates: Requirements 5.1**

- [ ] 3. พัฒนา Product Validator และ Controller
  - [ ] 3.1 สร้าง Product Validator (`backend/src/validators/product.validator.ts`)
    - พัฒนา validation rules ด้วย express-validator สำหรับการสร้างสินค้า (ฟิลด์ required ทั้งหมดพร้อม constraints)
    - พัฒนา validation rules สำหรับการอัปเดต (ทุกฟิลด์ optional, constraints เดียวกันเมื่อมีค่า)
    - พัฒนา validation สำหรับ pagination query params (page ≥ 1, limit 1-100, ต้องเป็นตัวเลข)
    - พัฒนา UUID format validation สำหรับ :id parameter
    - พัฒนา search query validation (1-200 ตัวอักษรเมื่อมีค่า)
    - Export และลงทะเบียนใน `backend/src/validators/index.ts`
    - _Requirements: 1.2, 1.4, 2.6, 3.3, 4.6, 4.7, 5.3_

  - [ ]* 3.2 เขียน property test: validation ปฏิเสธข้อมูลสินค้าที่ไม่ถูกต้อง (Property 2)
    - **Property 2: Validation rejects invalid product input**
    - สร้าง invalid product DTOs (ละเมิด constraint อย่างน้อย 1 ข้อ) และตรวจสอบว่าได้รับ 400 response พร้อมข้อผิดพลาดระบุฟิลด์
    - **Validates: Requirements 1.2, 1.4, 4.7**

  - [ ]* 3.3 เขียน property test: ปฏิเสธ pagination parameters ที่ไม่ถูกต้อง (Property 6)
    - **Property 6: Invalid pagination parameters rejected**
    - สร้างค่า page/limit ที่ไม่ใช่ตัวเลขหรืออยู่นอกช่วง และตรวจสอบว่าได้รับ 400 response
    - **Validates: Requirements 2.6**

  - [ ]* 3.4 เขียน property test: ปฏิเสธ ID format ที่ไม่ถูกต้อง (Property 7)
    - **Property 7: Invalid ID format rejected**
    - สร้าง string ที่ไม่ใช่ UUID และตรวจสอบว่าได้รับ 400 response บน GET/PUT/DELETE endpoints
    - **Validates: Requirements 3.3, 5.3**

  - [ ] 3.5 พัฒนา Product Controller (`backend/src/controllers/product.controller.ts`)
    - พัฒนา `findAll` — ดึง validated query params, เรียก service, คืน paginated response ด้วย 200
    - พัฒนา `findById` — ดึง validated id param, เรียก service, คืนข้อมูลสินค้าหรือ 404
    - พัฒนา `create` — ดึง validated body, เรียก service, คืนสินค้าที่สร้างด้วย 201
    - พัฒนา `update` — ดึง validated id และ body, เรียก service, คืนสินค้าที่อัปเดตด้วย 200
    - พัฒนา `delete` — ดึง validated id, เรียก service, คืนข้อความสำเร็จด้วย 200
    - ใช้ try/catch ร่วมกับ next(error) เพื่อมอบหมายการจัดการ error
    - Export และลงทะเบียนใน `backend/src/controllers/index.ts`
    - _Requirements: 1.1, 1.7, 2.1, 3.1, 3.2, 4.1, 4.4, 5.1, 5.2_

- [ ] 4. ตั้งค่า Product Routes และเชื่อมต่อ Backend
  - [ ] 4.1 สร้าง Product Routes (`backend/src/routes/product.routes.ts`)
    - กำหนด routes ทั้ง 5 เส้นทาง (GET list, GET by id, POST, PUT, DELETE) พร้อม authenticate middleware
    - ใส่ validator middleware ที่เหมาะสมในแต่ละ route
    - เชื่อมต่อ controller methods เป็น route handlers
    - ลงทะเบียน product routes ใน `backend/src/routes/index.ts` ภายใต้ `/api/products`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 เขียน unit tests สำหรับ product API endpoints
    - ทดสอบการบังคับ authentication บน product endpoints ทั้งหมด (401 สำหรับ token ที่หายไป/ไม่ถูกต้อง/หมดอายุ)
    - ทดสอบสร้างสินค้าด้วยข้อมูลที่ถูกต้องคืน 201 พร้อม product object ครบถ้วน
    - ทดสอบดึงสินค้าด้วย ID ที่ไม่มีอยู่คืน 404
    - ทดสอบลบสินค้าที่ไม่มีอยู่คืน 404
    - ทดสอบอัปเดตสินค้าที่ไม่มีอยู่คืน 404
    - ทดสอบ page ที่เกินจำนวน total pages คืน array ว่างพร้อม metadata ที่ถูกต้อง
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 1.7, 3.2, 4.4, 5.2, 2.7_

- [ ] 5. จุดตรวจสอบ - Backend API เสร็จสมบูรณ์
  - ตรวจสอบว่า tests ทั้งหมดผ่าน สอบถามผู้ใช้หากมีข้อสงสัย

- [ ] 6. พัฒนา Frontend Product Types และ API Service
  - [ ] 6.1 กำหนด Frontend Product types (`frontend/src/types/index.ts`)
    - เพิ่ม `Product` interface พร้อม id, name, sku, category, quantity, unitPrice, description, status, createdAt, updatedAt
    - เพิ่ม `CreateProductPayload`, `UpdateProductPayload`, `ProductQueryParams` และ `PaginatedProductResponse` types
    - _Requirements: 1.7, 2.4_

  - [ ] 6.2 สร้าง Product API service functions
    - สร้าง `frontend/src/services/productApi.ts` (หรือต่อเติม api service ที่มีอยู่)
    - พัฒนา `getProducts(params)` — GET /api/products พร้อม query params
    - พัฒนา `getProductById(id)` — GET /api/products/:id
    - พัฒนา `createProduct(data)` — POST /api/products
    - พัฒนา `updateProduct(id, data)` — PUT /api/products/:id
    - พัฒนา `deleteProduct(id)` — DELETE /api/products/:id
    - ใช้ axios instance ที่มีอยู่พร้อม JWT interceptor
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ] 7. พัฒนา Frontend Product UI Components
  - [ ] 7.1 สร้าง Product Form Modal (`frontend/src/components/ProductFormModal.tsx`)
    - สร้าง form modal ที่ใช้ซ้ำได้สำหรับทั้งโหมดสร้างและแก้ไข
    - เพิ่ม input fields สำหรับ name, sku, category, quantity, unit_price, description และ status (dropdown)
    - พัฒนา client-side validation ที่ตรงกับ constraints ของ backend (ความยาวฟิลด์, ช่วงตัวเลข, รูปแบบ SKU)
    - แสดง API error messages ภายใน modal โดยไม่ปิด modal เมื่อเกิดข้อผิดพลาด
    - แสดงสถานะ loading ระหว่างส่งฟอร์ม
    - เติมข้อมูลเดิมในฟอร์มเมื่ออยู่ในโหมดแก้ไข
    - _Requirements: 7.4, 7.5, 7.8_

  - [ ] 7.2 สร้าง Product Delete Confirm Dialog (`frontend/src/components/ProductDeleteConfirmDialog.tsx`)
    - สร้าง dialog ยืนยันการลบที่แสดงชื่อสินค้า
    - เพิ่มปุ่มยืนยันและยกเลิก
    - แสดงสถานะ loading ระหว่างส่งคำขอลบ
    - _Requirements: 7.6_

  - [ ] 7.3 สร้าง Product List Page (`frontend/src/pages/ProductListPage.tsx`)
    - พัฒนาตารางข้อมูลพร้อมคอลัมน์: name, SKU, category, quantity, unit_price, status, created date
    - พัฒนาช่องค้นหาพร้อม debounce 300ms ที่เรียก API เมื่อหยุดพิมพ์
    - พัฒนาตัวควบคุม pagination พร้อมปุ่มก่อนหน้า/ถัดไป, แสดงหน้าปัจจุบัน และจำนวนหน้าทั้งหมด (ค่าเริ่มต้น 20 รายการ/หน้า)
    - เพิ่มปุ่มสร้างที่เปิด ProductFormModal ในโหมดสร้าง
    - เพิ่มปุ่มแก้ไขในแต่ละแถวที่เปิด ProductFormModal ในโหมดแก้ไขพร้อมข้อมูลเดิม
    - เพิ่มปุ่มลบในแต่ละแถวที่เปิด ProductDeleteConfirmDialog
    - แสดง loading indicator ระหว่างดึงข้อมูล
    - แสดงข้อความว่างเมื่อไม่พบสินค้า
    - แสดง notification สำเร็จ 3 วินาทีหลังดำเนินการ CRUD สำเร็จ และรีเฟรชรายการ
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ] 7.4 เพิ่ม Product List Page route และ navigation
    - เพิ่ม route สำหรับ ProductListPage ใน app router (เช่น `/products`)
    - ครอบด้วย ProtectedRoute สำหรับ authentication
    - เพิ่มลิงก์ navigation ใน Layout sidebar/navbar
    - _Requirements: 6.4, 7.1_

- [ ] 8. จุดตรวจสอบสุดท้าย - ระบบ Full Stack เสร็จสมบูรณ์
  - ตรวจสอบว่า tests ทั้งหมดผ่าน สอบถามผู้ใช้หากมีข้อสงสัย

## Notes

- Tasks ที่ทำเครื่องหมาย `*` เป็น optional สามารถข้ามได้เพื่อพัฒนา MVP ที่เร็วขึ้น
- แต่ละ task อ้างอิง requirements เฉพาะเพื่อให้สามารถตรวจสอบย้อนกลับได้
- จุดตรวจสอบ (Checkpoints) ช่วยให้มั่นใจว่าการตรวจสอบเป็นแบบทีละขั้น
- Property tests ตรวจสอบคุณสมบัติความถูกต้องแบบ universal โดยใช้ `fast-check` (ติดตั้งแล้ว)
- Unit tests ตรวจสอบตัวอย่างเฉพาะและ edge cases โดยใช้ Jest + Supertest
- การพัฒนาใช้รูปแบบ Controller → Service → Database ที่มีอยู่แล้วจากโมดูล User CRUD
- Frontend ใช้ axios instance ที่มีอยู่พร้อม JWT interceptor สำหรับ authentication
- ฐานข้อมูลใช้ MSSQL กับ connection pool ที่มีอยู่แล้ว

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "3.3", "3.4", "3.5", "6.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3"] },
    { "id": 6, "tasks": ["7.4"] }
  ]
}
```
