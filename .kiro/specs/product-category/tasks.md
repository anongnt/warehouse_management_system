# Implementation Plan: ระบบหมวดหมู่สินค้า (Product Category)

## Overview

พัฒนาระบบจัดการหมวดหมู่สินค้าแบบลำดับชั้น (hierarchical) สำหรับระบบคลังสินค้าที่มีอยู่ ครอบคลุม Backend API (Express/TypeScript/MSSQL) รองรับโครงสร้างต้นไม้สูงสุด 3 ระดับ, CRUD operations, status management, การตรวจสอบ circular reference และ depth constraint, และการเชื่อมโยงกับระบบ Product/SKU ที่มีอยู่เดิม

## Tasks

- [x] 1. จัดเตรียม Database Migration และ TypeScript Interfaces
  - [x] 1.1 สร้าง TypeScript interfaces และ DTOs สำหรับ Category
    - สร้าง interfaces ในไฟล์ `backend/src/types/interfaces.ts`: `CategoryModel`, `CreateCategoryDto`, `UpdateCategoryDto`, `CategoryQueryDto`, `CategoryResponse`, `CategoryTreeResponse`, `CategoryFlatResponse`, `CategoryDetailResponse`
    - เพิ่ม `ICategoryService` interface สำหรับ service layer
    - อัปเดต `backend/src/types/index.ts` เพื่อ export types ใหม่
    - _Requirements: 8.1, 1.1_
    - **Task completed** ✅

  - [x] 1.2 สร้าง Database migration สำหรับ categories table
    - สร้างไฟล์ `backend/src/database/migrations/001_create_categories.ts`
    - สร้างตาราง `categories` ที่ประกอบด้วย: id (UNIQUEIDENTIFIER PK), name (NVARCHAR(100) NOT NULL), code (NVARCHAR(10) NOT NULL UNIQUE), description (NVARCHAR(500) NULL), parent_id (UNIQUEIDENTIFIER NULL FK self-reference), status (NVARCHAR(10) DEFAULT 'active'), created_at, updated_at
    - เพิ่ม constraints: CK_categories_status, CK_categories_code, UQ_categories_name_parent
    - เพิ่ม indexes: IX_categories_parent_id, IX_categories_status, IX_categories_code
    - เพิ่มคอลัมน์ `category_id` (UNIQUEIDENTIFIER NULL) ในตาราง `products` พร้อม FK constraint และ index
    - _Requirements: 8.1, 8.2, 8.3_
    - **Task completed** ✅

- [x] 2. พัฒนา Category CRUD API
  - [x] 2.1 สร้าง Category validator
    - สร้างไฟล์ `backend/src/validators/category.validator.ts` โดยใช้ express-validator
    - สร้าง `createCategoryValidation`: name (1-100 ตัวอักษร, Thai/English/numbers/spaces), code (2-10 uppercase A-Z), description (optional, 0-500 ตัวอักษร), parentId (optional, UUID format)
    - สร้าง `updateCategoryValidation`: ทุกฟิลด์ optional พร้อม param id (UUID), ข้อจำกัดเดียวกับ create
    - สร้าง `categoryListValidation`: flat (optional boolean), search (optional, 1-100 ตัวอักษร), status (optional, 'active'|'inactive')
    - สร้าง `categoryIdValidation`: param id ต้องเป็น UUID
    - สร้าง `updateCategoryStatusValidation`: param id (UUID), body status ('active'|'inactive')
    - Export validators จาก `backend/src/validators/index.ts`
    - _Requirements: 1.5, 2.5, 3.3, 4.5, 5.5, 8.2_
    - **Task completed** ✅

  - [x] 2.2 สร้าง Category service
    - สร้างไฟล์ `backend/src/services/category.service.ts` ที่มี class `CategoryService`
    - สร้างเมธอด `findAll(query: CategoryQueryDto)`: คืนรายการเป็น tree structure (default) หรือ flat list (เมื่อ flat=true), รองรับ search (partial match case-insensitive บน name และ code), รองรับ status filter
    - สร้างเมธอด `findById(id)`: คืน CategoryDetailResponse (parent, children 1 level, productCount) หรือ throw NotFoundError
    - สร้างเมธอด `create(data: CreateCategoryDto)`: ตรวจสอบ code uniqueness (throw ConflictError), ตรวจสอบ parent_id exists (throw NotFoundError), ตรวจสอบ depth ≤ 3 (throw ValidationError), insert
    - สร้างเมธอด `update(id, data: UpdateCategoryDto)`: ตรวจสอบ exists (404), ตรวจสอบ code uniqueness excluding self (409), ตรวจสอบ circular reference (ห้ามย้ายไปใต้ตัวเองหรือลูกหลาน), ตรวจสอบ depth constraint เมื่อเปลี่ยน parent
    - สร้างเมธอด `updateStatus(id, status)`: ตรวจสอบ exists (404), อัปเดต status
    - สร้างเมธอด `delete(id)`: ตรวจสอบ exists (404), ตรวจสอบไม่มี subcategories (409), ตรวจสอบไม่มี products ผูกอยู่ (409), hard delete
    - สร้าง private helper methods: `getCategoryDepth()`, `getMaxChildDepth()`, `isDescendant()`, `buildTree()`
    - Export จาก `backend/src/services/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 8.3, 8.4, 8.5, 8.6_
    - **Task completed** ✅

  - [x] 2.3 สร้าง Category controller
    - สร้างไฟล์ `backend/src/controllers/category.controller.ts` ที่มี class `CategoryController`
    - สร้าง static methods: `findAll`, `findById`, `create`, `update`, `updateStatus`, `delete`
    - แต่ละเมธอดตรวจสอบ validation result, เรียก CategoryService, จัดรูปแบบ response `{ success: true, data: ... }` หรือ error response
    - Pattern เดียวกับ ProductController ที่มีอยู่
    - Export จาก `backend/src/controllers/index.ts`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_
    - **Task completed** ✅

  - [x] 2.4 สร้าง Category routes และลงทะเบียนในแอปพลิเคชัน
    - สร้างไฟล์ `backend/src/routes/category.routes.ts` กำหนด endpoints ภายใต้ `/api/categories`
    - ใช้ `authenticate` middleware กับทุก route
    - เชื่อมต่อ validators → controller: GET /, GET /:id, POST /, PUT /:id, PATCH /:id/status, DELETE /:id
    - ลงทะเบียน category routes ใน `backend/src/routes/index.ts`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_
    - **Task completed** ✅

- [x] 3. จุดตรวจสอบ - ตรวจยืนยัน Category CRUD API
  - TypeScript compiles cleanly (`tsc --noEmit` passes) ✅
  - **Task completed** ✅

- [x] 4. เชื่อมโยง Product กับ Category
  - [x] 4.1 แก้ไข Product Service เพื่อรองรับ category_id
    - แก้ไข `backend/src/services/product.service.ts`
    - เมธอด `create`: เพิ่มการตรวจสอบ category_id ว่ามีอยู่ในตาราง categories และมีสถานะ active (throw ValidationError ถ้าไม่ผ่าน), บันทึก category_id ลงตาราง products
    - เมธอด `update`: ถ้าส่ง category_id มา ให้ตรวจสอบเช่นเดียวกับ create
    - เมธอด `generateSku`: แก้ไขให้ดึง category_code จากตาราง categories ตาม category_id แทนการใช้ hardcoded mapping, fallback เป็น "MISC" ถ้าไม่มี code
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - **Task completed** ✅

  - [x] 4.2 แก้ไข Product Validator เพื่อรองรับ category_id
    - แก้ไข `backend/src/validators/product.validator.ts`
    - เพิ่ม `category_id` validation ใน createProductValidation (required, UUID format)
    - เพิ่ม `category_id` validation ใน updateProductValidation (optional, UUID format)
    - อัปเดต generateSkuPreviewValidation ให้รับ `categoryId` (UUID) แทน category string
    - _Requirements: 7.1_
    - **Task completed** ✅

- [x] 5. จุดตรวจสอบ - ตรวจยืนยัน Product-Category Integration
  - TypeScript compiles cleanly (`tsc --noEmit` passes) ✅
  - **Task completed** ✅

- [x] 6. เขียน Property-Based Tests สำหรับ Category
  - [x]* 6.1 เขียน property test: Category creation round-trip
    - **Property 1: Category creation round-trip**
    - สร้างไฟล์ `backend/src/__tests__/category.property.test.ts`
    - ตั้งค่า fast-check generators: `validNameArb`, `validCodeArb`, `validDescriptionArb`
    - สำหรับทุก valid name (1-100 chars, Thai/English/numbers/spaces) และ valid code (2-10 uppercase A-Z), POST create แล้ว GET by ID ต้องได้ค่าเดียวกัน status='active' timestamps ถูกต้อง
    - **Validates: Requirements 1.1, 8.1**
    - **Task completed** ✅

  - [x]* 6.2 เขียน property test: Code uniqueness enforcement
    - **Property 2: Code uniqueness enforcement**
    - สำหรับทุกสอง requests ที่มี code เดียวกัน request ที่สองต้องได้ 409 CONFLICT
    - **Validates: Requirements 1.3, 4.2, 8.6**
    - **Task completed** ✅

  - [x]* 6.3 เขียน property test: Non-existent parent reference rejected
    - **Property 3: Non-existent parent reference rejected**
    - สำหรับทุก random UUID ที่ไม่มีในระบบ การสร้างหรือแก้ไข category ด้วย parentId นั้นต้องได้ 404 NOT_FOUND
    - **Validates: Requirements 1.4, 4.7, 8.4**
    - **Task completed** ✅

  - [x]* 6.4 เขียน property test: Validation rejects invalid input
    - **Property 4: Validation rejects invalid input**
    - สำหรับทุก input ที่ name ว่าง/เกิน 100, code ไม่ใช่ uppercase A-Z หรือไม่อยู่ 2-10 chars, description เกิน 500 ต้องได้ 400 VALIDATION_ERROR พร้อมระบุฟิลด์
    - **Validates: Requirements 1.5, 4.5, 8.2, 2.5**
    - **Task completed** ✅

  - [x]* 6.5 เขียน property test: Depth constraint enforcement
    - **Property 5: Depth constraint enforcement**
    - สำหรับทุก hierarchy ที่มีอยู่แล้ว 3 ระดับ การสร้าง subcategory เพิ่มหรือ move ที่จะเกิน 3 levels ต้องได้ 400 VALIDATION_ERROR
    - **Validates: Requirements 1.2, 1.6, 4.6, 8.3, 8.5**
    - **Task completed** ✅

  - [x]* 6.6 เขียน property test: Search filter correctness
    - **Property 6: Search filter correctness**
    - สำหรับทุก search term ผลลัพธ์ทั้งหมดต้องมี name หรือ code ที่ contain search term (case-insensitive)
    - **Validates: Requirements 2.3**
    - **Task completed** ✅

  - [x]* 6.7 เขียน property test: Status filter correctness
    - **Property 7: Status filter correctness**
    - สำหรับทุก collection ที่มีทั้ง active/inactive การ filter ด้วย status ต้องคืนเฉพาะ categories ที่มี status ตรงกัน
    - **Validates: Requirements 2.4**
    - **Task completed** ✅

  - [x]* 6.8 เขียน property test: Non-existent category_id returns NOT_FOUND
    - **Property 8: Non-existent category_id returns NOT_FOUND**
    - สำหรับทุก random UUID ที่ไม่มีในระบบ GET detail, PUT, DELETE, PATCH status ต้องได้ 404
    - **Validates: Requirements 3.2, 4.3, 5.4, 6.3**
    - **Task completed** ✅

  - [x]* 6.9 เขียน property test: Invalid UUID format rejected
    - **Property 9: Invalid UUID format rejected**
    - สำหรับทุก string ที่ไม่ใช่ UUID format ทุก endpoint ที่รับ ID parameter ต้องได้ 400 VALIDATION_ERROR
    - **Validates: Requirements 3.3, 5.5**
    - **Task completed** ✅

  - [x]* 6.10 เขียน property test: Partial update preserves unmodified fields
    - **Property 10: Partial update preserves unmodified fields**
    - สำหรับทุก subset ของ updatable fields (name, code, description, parentId) PUT เฉพาะ subset นั้น ฟิลด์อื่นต้องไม่เปลี่ยน
    - **Validates: Requirements 4.1**
    - **Task completed** ✅

  - [x]* 6.11 เขียน property test: Status toggle round-trip
    - **Property 11: Status toggle round-trip**
    - สำหรับทุก category PATCH status เป็น inactive แล้ว PATCH กลับ active ข้อมูลอื่นต้องเหมือนเดิม
    - **Validates: Requirements 6.1, 6.2**
    - **Task completed** ✅

  - [x]* 6.12 เขียน property test: Delete removes category permanently
    - **Property 12: Delete removes category permanently**
    - สำหรับทุก category ที่ไม่มี subcategories และไม่มี products ผูกอยู่ DELETE แล้ว GET ต้องได้ 404
    - **Validates: Requirements 5.1**
    - **Task completed** ✅

  - [x]* 6.13 เขียน property test: Product category_id validation
    - **Property 13: Product category_id validation**
    - สำหรับทุก product create/update ถ้า category_id ไม่มีอยู่หรือมีสถานะ inactive ต้องได้ 400 VALIDATION_ERROR
    - **Validates: Requirements 7.1, 7.2**
    - **Task completed** ✅

  - [x]* 6.14 เขียน property test: SKU generation from category code
    - **Property 14: SKU generation from category code**
    - สำหรับทุก category ที่มี valid code การสร้าง product ภายใต้ category นั้นโดยไม่ระบุ SKU ต้องได้ SKU รูปแบบ `{category_code}-{5-digit-number}` ที่เพิ่มขึ้นต่อเนื่อง
    - **Validates: Requirements 7.3**
    - **Task completed** ✅

  - [x]* 6.15 เขียน property test: Tree structure returns correct nesting
    - **Property 15: Tree structure returns correct nesting**
    - สำหรับทุก set ของ categories ที่มี parent-child tree endpoint ต้อง return root categories ที่ top level กับ children nested recursively ทุก category ปรากฏครั้งเดียว
    - **Validates: Requirements 2.1**
    - **Task completed** ✅

  - [x]* 6.16 เขียน property test: Flat list preserves hierarchy ordering
    - **Property 16: Flat list preserves hierarchy ordering**
    - สำหรับทุก set ของ categories ที่มี parent-child flat list ต้องเรียงให้ parent อยู่ก่อน children เสมอ
    - **Validates: Requirements 2.2**
    - **Task completed** ✅

- [x] 7. เขียน Integration Tests สำหรับ Category
  - [x]* 7.1 เขียน integration tests สำหรับ Category CRUD lifecycle
    - สร้างไฟล์ `backend/src/__tests__/category.api.test.ts`
    - ทดสอบ full CRUD lifecycle: create → read (list + detail) → update → status change → delete
    - ทดสอบ circular reference detection: สร้าง A→B→C chain แล้วลอง move A ไปใต้ C
    - ทดสอบ depth limit on move: สร้าง tree 3 ระดับ แล้วลอง move ที่จะสร้าง depth 4
    - ทดสอบ delete with products: ผูก product กับ category แล้วลอง delete
    - ทดสอบ delete with subcategories: สร้าง parent-child แล้วลอง delete parent
    - ทดสอบ category detail response: สร้าง tree แล้วตรวจสอบ response structure (parent, children, productCount)
    - ทดสอบ empty search results: ค้นหาด้วยคำที่ไม่มี verify empty array
    - ทดสอบ authentication: verify ทุก endpoint ต้องมี valid token
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 2.6, 3.1, 3.2, 4.1, 4.4, 4.6, 5.1, 5.2, 5.3, 6.1, 6.2_
    - **Task completed** ✅

  - [x]* 7.2 เขียน integration tests สำหรับ Product-Category integration
    - เพิ่ม test cases ใน `backend/src/__tests__/category.api.test.ts` หรือสร้างไฟล์แยก
    - ทดสอบ: สร้าง category → สร้าง product ด้วย category_id → ตรวจสอบ SKU generation ใช้ category_code
    - ทดสอบ: สร้าง product ด้วย category_id ที่ inactive → ต้องได้ error
    - ทดสอบ: SKU fallback เป็น MISC เมื่อ category ไม่มี code
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - **Task completed** ✅

- [x] 8. จุดตรวจสอบสุดท้าย - ตรวจยืนยันการทำงานทั้งระบบ
  - TypeScript compiles cleanly (`tsc --noEmit` passes) ✅
  - All source code implemented and test files created ✅
  - **Task completed** ✅

## Notes

- งานที่มีเครื่องหมาย `*` เป็นงานที่ไม่บังคับ (optional) สามารถข้ามได้เพื่อเร่ง MVP
- แต่ละงานอ้างอิง requirements เฉพาะเพื่อให้ตรวจสอบย้อนกลับได้
- จุดตรวจสอบ (checkpoints) ช่วยให้ตรวจยืนยันแบบค่อยเป็นค่อยไป
- Property tests ใช้ fast-check (มีอยู่แล้วใน devDependencies) เพื่อตรวจสอบ correctness properties แบบ universal (อย่างน้อย 100 iterations ต่อ property)
- Unit tests ตรวจสอบตัวอย่างเฉพาะและกรณีขอบ (edge cases)
- Backend ใช้ pattern เดิมที่มีอยู่: express-validator, static controller methods, service classes, error middleware
- Migration strategy: เก็บคอลัมน์ `category` (NVARCHAR) เดิมไว้ก่อนเพื่อ backward compatibility, สินค้าใหม่ต้องระบุ `category_id`
- Depth validation ใช้ recursive CTE query สำหรับตรวจสอบ child depth เมื่อ move category

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "4.2"] },
    { "id": 4, "tasks": ["2.4", "4.1"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "6.12"] },
    { "id": 6, "tasks": ["6.13", "6.14", "6.15", "6.16", "7.1"] },
    { "id": 7, "tasks": ["7.2"] }
  ]
}
```
