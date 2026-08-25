# Implementation Plan: Stock Management

## Overview

แผนการพัฒนานี้แปลงเอกสารออกแบบระบบจัดการสต็อกเป็นขั้นตอนการเขียนโค้ดแบบเพิ่มทีละส่วน โดยเรียงลำดับจากฐานข้อมูล → ชนิดข้อมูล → ตรรกะบัญชีบริสุทธิ์ (pure functions) → บริการที่ใช้ทรานแซกชัน → ชั้น HTTP → การทดสอบระดับ API และคุณสมบัติ → ตัวป้องกันการลบสินค้า → ฝั่ง Frontend และการเชื่อมต่อเมนู/เส้นทาง

ภาษาที่ใช้: **TypeScript** ทั้ง Backend (Node.js + Express + MSSQL) และ Frontend (React + Vite) ตามที่เอกสารออกแบบระบุไว้แล้ว

หมายเหตุสำคัญ 2 ข้อที่มีผลต่อลำดับงาน:

- ฟีเจอร์นี้เป็น **ฟีเจอร์แรกของโค้ดเบสที่ใช้ `sql.Transaction`** ยังไม่มีแบบแผนเดิมให้ลอก ดังนั้นตัวช่วย `withTransaction` / `withRetry` / `lockProducts` จึงถูกจัดไว้เป็นงานย่อยแรกของ `StockService` (งาน 5.1) เพื่อให้ทุกเมธอดที่เขียนข้อมูลใช้แบบแผนเดียวกัน
- ฝั่ง Frontend **ยังไม่มี test runner ใด ๆ** จึงมีงานติดตั้ง `vitest` + `@testing-library` + `fast-check` แบบตรึงเวอร์ชันแยกเป็นงานของตัวเอง (งาน 19) ซึ่งต้องเสร็จก่อนงานทดสอบฝั่ง Frontend ทั้งหมด (งาน 20)

## Tasks

- [x] 1. สร้างสคีมาฐานข้อมูลสำหรับเอกสารและบัญชีความเคลื่อนไหวสต็อก
  - [x] 1.1 เขียน migration `002_create_stock_movements.ts` และสคริปต์ `migrate:stock`
    - สร้างไฟล์ `backend/src/database/migrations/002_create_stock_movements.ts` ตามแบบแผนของ `001_create_categories.ts` (`IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='...' AND xtype='U')` + `PRINT`)
    - สร้างตาราง `stock_documents` พร้อม `UQ_stock_documents_number`, `CK_stock_documents_type`, `CK_stock_documents_status`, `CK_stock_documents_cancel_fields`, FK ไป `users(id)` และ index `IX_stock_documents_type_date`, `IX_stock_documents_status`, `IX_stock_documents_created_by`
    - สร้างตาราง `stock_movements` พร้อม `seq BIGINT IDENTITY(1,1)`, `reversal_of_movement_id`, `CK_stock_movements_type`, `CK_stock_movements_quantity`, `CK_stock_movements_balance_before/after`, `CK_stock_movements_balance_math`, `CK_stock_movements_sign`, `CK_stock_movements_unit_cost`, FK ไป `stock_documents`, `products`, `users`, `stock_movements` (self) และ index `UX_stock_movements_seq`, `IX_stock_movements_product_seq`, `IX_stock_movements_document`, `IX_stock_movements_type`, `IX_stock_movements_created_at`
    - เพิ่มสคริปต์ `"migrate:stock": "ts-node src/database/migrations/002_create_stock_movements.ts"` ใน `backend/package.json`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.7, 8.3, 6.3_

  - [ ]* 1.2 เขียน smoke test ตรวจสคีมาหลัง migration
    - สร้าง `backend/src/__tests__/stock-schema.smoke.test.ts`
    - ตรวจคอลัมน์และชนิดข้อมูลของ `stock_documents` / `stock_movements` จาก `INFORMATION_SCHEMA.COLUMNS`
    - ตรวจการมีอยู่ของ CHECK constraint ทุกตัวจาก `sys.check_constraints` และ unique constraint บน `document_number`
    - _Requirements: 7.1, 7.2_

- [x] 2. ประกาศชนิดข้อมูลและค่าคงที่ของฟีเจอร์สต็อก
  - [x] 2.1 สร้าง `backend/src/types/stock.types.ts`
    - ประกาศ `MovementType`, `StockDocumentType`, `StockDocumentStatus`, `DocumentPrefix`, `STOCK_DOCUMENT_PREFIX`, `LOW_STOCK_THRESHOLD_DEFAULT`
    - ประกาศ DTO: `StockItemInput`, `AdjustmentItemInput`, `CreateReceiptDto`, `CreateIssueDto`, `CreateAdjustmentDto`, `CancelDocumentDto`, `StockBalanceQueryDto`, `StockMovementQueryDto`
    - ประกาศ response (camelCase): `StockMovementResponse`, `StockDocumentResponse`, `CancelDocumentResponse`, `StockBalanceResponse`, `StockBalanceDetailResponse`
    - ประกาศ model (snake_case): `StockDocumentModel`, `StockMovementModel` และ interface `IStockService`
    - _Requirements: 7.1, 7.2, 4.1, 5.1, 6.3_

  - [x] 2.2 เชื่อม type ใหม่เข้ากับ barrel export และเพิ่มค่าคงที่ใน `dto.ts`
    - แก้ `backend/src/types/index.ts` เพิ่ม `export * from './stock.types'`
    - แก้ `backend/src/types/dto.ts` เพิ่ม/re-export `LOW_STOCK_THRESHOLD_DEFAULT` และ `STOCK_DOCUMENT_PREFIX` ให้โมดูลอื่นเรียกใช้ได้ตามแบบแผนเดิม
    - _Requirements: 4.6, 8.1_

- [x] 3. สร้างตรรกะบัญชีบริสุทธิ์ใน `stock-ledger.ts` และทดสอบคุณสมบัติเชิงเลขคณิต
  - [x] 3.1 เขียนการรวมรายการซ้ำและบรรทัดบัญชีรับเข้า/จ่ายออก
    - สร้าง `backend/src/services/stock-ledger.ts` พร้อม `LedgerProductSnapshot`, `LedgerLine`, `MAX_BALANCE`
    - เขียน `normalizeQuantityItems` (รวม `productId` ซ้ำ + เรียงตาม `productId` ascending)
    - เขียน `buildReceiptLines` (quantity เป็นบวก, ตรวจเพดาน 999999, ตรวจ `inactive`, ตรวจไม่พบสินค้า, เก็บ `unitCost`)
    - เขียน `buildIssueLines` (quantity เป็นลบ, ตรวจยอดคงเหลือไม่พอพร้อมข้อความระบุ sku/คงเหลือ/จำนวนที่ขอ)
    - โยน `NotFoundError` / `ValidationError` จาก `utils/errors.ts` ตามตารางข้อผิดพลาดในเอกสารออกแบบ
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.8, 1.9, 2.1, 2.3, 2.4, 2.5, 2.7, 7.5, 7.7_

  - [x] 3.2 เขียนบรรทัดบัญชีปรับยอดและกลับรายการ
    - เขียน `normalizeAdjustmentItems` (รายการ `productId` ซ้ำ ให้ใช้รายการสุดท้ายเป็นจำนวนที่นับได้จริง)
    - เขียน `buildAdjustmentLines` (`balanceAfter = countedQuantity`, `quantity = counted − balanceBefore` รองรับกรณีส่วนต่างเป็น 0)
    - เขียน `buildReversalLines` (1 บรรทัดต่อ movement เดิม 1 แถว, `quantity = -original.quantity`, `movementType = 'reversal'`, `reversalOfMovementId = original.id`, โยน `ConflictError` เมื่อผลหักกลบทำให้ยอดต่ำกว่า 0)
    - _Requirements: 3.1, 3.2, 3.4, 3.8, 6.1, 6.5_

  - [x] 3.3 เขียนฟังก์ชันสร้างและแยกวิเคราะห์เลขที่เอกสาร
    - เขียน `formatDocumentNumber(prefix, date, running)` → `{prefix}-{YYYYMMDD ตาม UTC}-{NNNN}`
    - เขียน `parseDocumentNumber(documentNumber)` คืน `{ prefix, datePart, running }` หรือ `null` เมื่อรูปแบบไม่ตรง `^(RC|IS|AJ)-\d{8}-\d{4}$`
    - ประกาศ `MAX_RUNNING_NUMBER = 9999`
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ]* 3.4 เขียน property test สำหรับบรรทัดบัญชีรับเข้า/จ่ายออก
    - สร้าง `backend/src/__tests__/stock-ledger.property.test.ts` (fast-check, `{ numRuns: 100 }`)
    - **Property 1: บรรทัดบัญชีรับเข้าและจ่ายออกถูกต้องตามเลขคณิตและเครื่องหมาย**
    - **Validates: Requirements 1.1, 1.2, 2.1, 7.5, 7.7**

  - [ ]* 3.5 เขียน property test สำหรับการปฏิเสธที่ขอบเขตของยอดคงเหลือ
    - **Property 2: การปฏิเสธที่ขอบเขตของยอดคงเหลือ**
    - **Validates: Requirements 1.8, 2.3**

  - [ ]* 3.6 เขียน property test สำหรับการปรับยอดและการคำนวณส่วนต่าง
    - ใช้ `adjustmentPairArb` เพื่อให้สุ่มกรณี `counted = balance` ได้ด้วย
    - **Property 3: การปรับยอดตั้งยอดเป็นจำนวนที่นับได้และคำนวณส่วนต่างถูกต้อง**
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [ ]* 3.7 เขียน property test สำหรับการรวมรายการสินค้าซ้ำ
    - **Property 5: รายการสินค้าซ้ำถูกรวมก่อนตรวจสอบและบันทึก**
    - **Validates: Requirements 1.9, 2.7**

  - [ ]* 3.8 เขียน property test สำหรับการแปลงเลขที่เอกสารไปกลับ
    - **Property 19: เลขที่เอกสารแปลงไปกลับได้ (round-trip) และมีรูปแบบตามที่กำหนด**
    - **Validates: Requirements 8.1**

  - [ ]* 3.9 เขียน unit test กรณีขอบของเลขรันเอกสาร
    - ทดสอบ `formatDocumentNumber` ที่ running = 1 และ 9999 และตรวจว่า running > `MAX_RUNNING_NUMBER` ถือเป็นค่านอกช่วงที่ผู้เรียกต้องปฏิเสธ
    - ทดสอบ `parseDocumentNumber` กับสตริงที่รูปแบบผิด (prefix ผิด, จำนวนหลักผิด, ไม่มีขีด)
    - _Requirements: 8.5_

- [ ] 4. Checkpoint - ยืนยันตรรกะบัญชีก่อนต่อชั้นฐานข้อมูล
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. สร้าง `StockService` พร้อมแบบแผนทรานแซกชันและการล็อกแถว
  - [x] 5.1 เขียนตัวช่วยทรานแซกชัน การลองใหม่ และการล็อกแถวสินค้า
    - สร้าง `backend/src/services/stock.service.ts` เป็น `class StockService implements IStockService`
    - เขียน `withTransaction<T>(fn)`: `new sql.Transaction(pool)` + `begin(sql.ISOLATION_LEVEL.READ_COMMITTED)` + commit + rollback ใน catch ที่ห่อ try เงียบ
    - เขียน `withRetry<T>(fn)`: ดัก SQL error 2627/2601 (unique violation) และ 1205 (deadlock victim) ลองใหม่สูงสุด 3 ครั้ง พร้อม backoff 50/100/200 ms
    - เขียน `lockProducts(tx, productIds)`: `SELECT id, sku, status, quantity FROM products WITH (UPDLOCK, ROWLOCK) WHERE id = @id` ยิงทีละรายการเรียงตาม `productId` ascending คืน `Map<string, LedgerProductSnapshot>`
    - _Requirements: 1.4, 2.2, 2.8, 3.3, 6.4, 7.3, 7.4, 8.4_

  - [x] 5.2 เขียนการสร้างเลขที่เอกสารและตัวช่วยเขียน/อ่านข้อมูล
    - เขียน `nextDocumentNumber(tx, type, date)`: `SELECT MAX(CAST(RIGHT(document_number,4) AS INT)) FROM stock_documents WITH (UPDLOCK, HOLDLOCK) WHERE document_number LIKE @pattern` แล้ว `next = (max ?? 0) + 1` และโยน `ConflictError('จำนวนเอกสารของวันนี้ถึงขีดจำกัดแล้ว (9,999 ฉบับ)')` เมื่อ next > 9999
    - เขียน `insertDocument`, `insertMovements`, `applyBalances` (UPDATE `products.quantity` = `balanceAfter` ของบรรทัดสุดท้ายของสินค้านั้นในทรานแซกชัน)
    - เขียน `loadDocumentResponse(txOrPool, documentId)`, `toMovementResponse(row)`, `toBalanceResponse(row)` ตามแบบแผน `toProductResponse` เดิม
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 7.3, 9.5_

  - [x] 5.3 เขียน `createReceipt` และ `createIssue`
    - ลำดับ: `normalizeQuantityItems` → `withRetry(withTransaction(...))` → `lockProducts` → `build*Lines` → `nextDocumentNumber` → `insertDocument` → `insertMovements` → `applyBalances` → `loadDocumentResponse`
    - ใช้เวลาปัจจุบัน UTC เป็น `document_date` เมื่อไม่ระบุ และบันทึก `created_by` จาก `userId` ที่ส่งเข้ามา
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 9.5_

  - [x] 5.4 เขียน `createAdjustment`
    - ใช้ `normalizeAdjustmentItems` + `buildAdjustmentLines` ในทรานแซกชันเดียวกับการ insert และ update ยอด
    - บันทึก `reason` รายรายการลง `stock_movements.reason` และคืน `difference` ในผลลัพธ์
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8, 3.9, 9.5_

  - [x] 5.5 เขียน `cancelDocument`
    - ตรวจสถานะเอกสาร: ไม่พบ → `NotFoundError('ไม่พบเอกสาร')`, `cancelled` แล้ว → `ConflictError('เอกสารนี้ถูกยกเลิกแล้ว')`
    - อ่าน movement เดิมทุกแถวของเอกสาร → `lockProducts` → `buildReversalLines` → insert reversal (`document_id` ยังชี้เอกสารเดิม) → UPDATE หัวเอกสารเป็น `cancelled` พร้อม `cancelled_by`, `cancelled_at`, `cancel_reason` → `applyBalances` ทั้งหมดในทรานแซกชันเดียว
    - ไม่ลบและไม่แก้ไข movement เดิม และคืน `CancelDocumentResponse`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8, 6.9_

  - [x] 5.6 เขียน `findBalances` และ `findBalanceByProductId`
    - `findBalances`: query ตามหัวข้อ Query Design (subquery `last_movement_at`, `ROUND(... , 2)` สำหรับ `stock_value`, ตัวกรอง search/categoryId/lowStock/threshold, `ORDER BY` สลับตาม `lowStock`, OFFSET/FETCH) คืน `PaginatedResponse` พร้อม `total`, `page`, `totalPages` (ผลลัพธ์ว่าง → `total = 0`, `totalPages = 1`)
    - `findBalanceByProductId`: ไม่พบ → `NotFoundError('ไม่พบสินค้า')`; พบ → คืนข้อมูลสินค้า + `recentMovements` ล่าสุด 5 รายการ (ใหม่ → เก่า)
    - ใช้ `LOW_STOCK_THRESHOLD_DEFAULT` เป็นค่าเริ่มต้นของ threshold และ page=1 / limit=20 เป็นค่าเริ่มต้นการแบ่งหน้า
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 5.7 เขียน `findMovements` และ `findDocumentById`
    - `findMovements`: join `stock_documents` / `products` / `users`, ตัวกรอง productId/movementType/startDate/endDate (ใช้ `d.document_date < DATEADD(day, 1, @endDate)`), เรียง `m.seq ASC` เมื่อระบุ `productId` (โหมด Stock_Card) และ `m.created_at DESC, m.seq DESC` ในกรณีอื่น
    - `findDocumentById`: ไม่พบ → `NotFoundError('ไม่พบเอกสาร')`; พบ → คืนหัวเอกสาร + รายการทั้งหมด + สถานะ + ชื่อผู้บันทึก
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.9, 5.10_

- [x] 6. สร้างชั้น HTTP: validator, controller และเส้นทาง
  - [x] 6.1 เขียน `backend/src/validators/stock.validator.ts`
    - `createReceiptValidation`, `createIssueValidation`, `createAdjustmentValidation`, `cancelDocumentValidation`, `stockBalanceListValidation`, `stockMovementListValidation`, `productIdParamValidation`, `documentIdValidation`
    - ใช้ `UUID_REGEX` ชุดเดียวกับ `product.validator.ts`, `items` เป็น `isArray({ min: 1, max: 100 })`, ตรวจทศนิยม `unitCost` ≤ 2 ตำแหน่งด้วยตรรกะเดียวกับ `unitPrice` เดิม, ตรวจข้ามฟิลด์ `startDate <= endDate`
    - ข้อความทั้งหมดเป็นภาษาไทย
    - _Requirements: 1.7, 2.6, 3.6, 3.7, 4.10, 5.7, 5.8_

  - [x] 6.2 เขียน `backend/src/controllers/stock.controller.ts`
    - `static` methods: `createReceipt`, `createIssue`, `createAdjustment`, `cancelDocument`, `findDocumentById`, `findBalances`, `findBalanceByProductId`, `findMovements`, `rejectMutation`
    - แต่ละเมธอด: ตรวจ `validationResult(req)` → 400 พร้อม `details: errors.array().map(...)` → แปลง input → เรียก service ด้วย `(req as any).user.userId` → คืน envelope `{ success, data, message }` และส่ง error ต่อด้วย `next(error)`
    - ข้อความสำเร็จภาษาไทยตามตารางในเอกสารออกแบบ; `rejectMutation` โยน `ForbiddenError('รายการความเคลื่อนไหวแก้ไขหรือลบไม่ได้ กรุณายกเลิกเอกสารแทน')`
    - _Requirements: 1.7, 2.6, 3.6, 3.7, 4.10, 5.7, 5.8, 7.8, 9.5, 10.5, 10.6_

  - [x] 6.3 เขียน `stock.routes.ts` และเชื่อมเข้ากับ barrel/route index
    - สร้าง `backend/src/routes/stock.routes.ts` พร้อม `router.use(authenticate)` และเพิ่ม `requireAdmin` ที่ `/adjustments` และ `/documents/:id/cancel`
    - ประกาศ `/balances` ก่อน `/balances/:productId` และ `/documents/:id/cancel` ก่อน `/documents/:id`; เพิ่ม PUT/PATCH/DELETE `/movements/:id` → `StockController.rejectMutation`
    - แก้ `backend/src/routes/index.ts` เพิ่ม `router.use('/stock', stockRoutes)` และแก้ `services/index.ts`, `controllers/index.ts` ให้ export `StockService`, `StockController`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 7.8_

- [ ] 7. Checkpoint - ยืนยันว่า Backend คอมไพล์ผ่านและเส้นทางทำงานได้
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. เขียนการทดสอบระดับ API ด้วยตัวอย่างเฉพาะและกรณีขอบ
  - [ ]* 8.1 เขียนการทดสอบเส้นทางสำเร็จของทุก endpoint
    - สร้าง `backend/src/__tests__/stock.api.test.ts` (supertest + `jest.mock('../middlewares/auth.middleware', ...)` ที่อ่าน role จาก header `x-test-role` และ mock เฉพาะ `authenticate`)
    - `beforeAll` รัน DDL แบบ `IF NOT EXISTS` และสร้างผู้ใช้ทดสอบ admin/user + สินค้า `sku LIKE 'STK-%'`; `afterAll` ลบตามลำดับ `stock_movements` → `stock_documents` → `products` → users
    - ทดสอบ happy path ของ POST `/receipts`, `/issues`, `/adjustments`, `/documents/:id/cancel` และ GET `/documents/:id`, `/balances`, `/balances/:productId`, `/movements`
    - ทดสอบว่าเมื่อไม่ระบุ `documentDate` ระบบใช้เวลาปัจจุบัน UTC
    - _Requirements: 1.3, 4.1, 4.7, 5.1, 5.6, 6.1_

  - [ ]* 8.2 เขียนการทดสอบข้อผิดพลาดรายกรณีและเส้นทาง guard
    - GET `/balances/:productId` ด้วย UUID ที่ไม่มีอยู่ → 404 `ไม่พบสินค้า`
    - GET `/documents/:id` และ POST `/documents/:id/cancel` ด้วย UUID ที่ไม่มีอยู่ → 404 `ไม่พบเอกสาร`
    - PUT, PATCH และ DELETE `/movements/:id` → 403 พร้อมข้อความ `รายการความเคลื่อนไหวแก้ไขหรือลบไม่ได้ กรุณายกเลิกเอกสารแทน` (3 กรณี)
    - _Requirements: 4.8, 5.9, 6.8, 7.8_

  - [ ]* 8.3 เขียนการทดสอบเส้นทางลองใหม่และขีดจำกัดของเลขที่เอกสาร
    - mock ให้ INSERT `stock_documents` ชน unique violation (SQL 2627): ชน 2 ครั้งแล้วสำเร็จ → 201; ชน 3 ครั้ง → 409 `สร้างเลขที่เอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`
    - mock ให้ `MAX(running)` คืน 9999 → 409 `จำนวนเอกสารของวันนี้ถึงขีดจำกัดแล้ว (9,999 ฉบับ)`
    - _Requirements: 8.4, 8.5_

- [ ] 9. เขียน property test ผ่าน API และฐานข้อมูลจริง (`stock.property.test.ts`)
  - [ ]* 9.1 เขียน property test สำหรับความเป็น all-or-nothing ของการบันทึกเอกสาร
    - สร้าง `backend/src/__tests__/stock.property.test.ts` พร้อม generator ขนาดเล็ก (สินค้า 1-4 รายการ, รายการต่อเอกสาร 1-5 บรรทัด), jest timeout 180000 ms, `{ numRuns: 100 }`
    - **Property 6: การบันทึกเอกสารเป็นสำเร็จทั้งหมดหรือไม่เปลี่ยนแปลงเลย**
    - **Validates: Requirements 1.4, 2.2, 3.3, 6.4**

  - [ ]* 9.2 เขียน property test สำหรับ product_id ที่ไม่มีอยู่
    - **Property 7: product_id ที่ไม่มีอยู่ทำให้ปฏิเสธทั้งฉบับโดยไม่มีผลข้างเคียง**
    - **Validates: Requirements 1.5, 2.4, 3.8**

  - [ ]* 9.3 เขียน property test สำหรับสินค้าสถานะ inactive
    - **Property 8: สินค้าสถานะ inactive ทำให้ปฏิเสธทั้งฉบับโดยไม่มีผลข้างเคียง**
    - **Validates: Requirements 1.6, 2.5**

  - [ ]* 9.4 เขียน property test สำหรับการรายงานข้อผิดพลาดของข้อมูลนำเข้า
    - **Property 9: การตรวจสอบข้อมูลนำเข้ารายงานทุกรายการและทุกฟิลด์ที่ไม่ผ่าน**
    - **Validates: Requirements 1.7, 2.6, 3.6, 3.7**

  - [ ]* 9.5 เขียน property test สำหรับการตรวจสอบพารามิเตอร์การค้นหา
    - **Property 10: การตรวจสอบพารามิเตอร์การค้นหา**
    - **Validates: Requirements 4.10, 5.7, 5.8**

  - [ ]* 9.6 เขียน property test สำหรับความเป็น idempotent ของยอดหลังปรับยอด
    - **Property 4: ยอดคงเหลือจากการปรับยอดเป็น idempotent**
    - **Validates: Requirements 3.9**

  - [ ]* 9.7 เขียน property test สำหรับความครบถ้วนของรายการหักกลบ
    - **Property 11: การยกเลิกสร้างรายการหักกลบครบถ้วนโดยไม่แก้ไขรายการเดิม**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 9.8 เขียน property test สำหรับการยกเลิกที่ทำให้ยอดติดลบ
    - **Property 12: การยกเลิกที่ทำให้ยอดต่ำกว่าศูนย์ถูกปฏิเสธโดยไม่มีผลข้างเคียง**
    - **Validates: Requirements 6.5**

  - [ ]* 9.9 เขียน property test สำหรับการยกเลิกซ้ำ
    - **Property 13: ยกเลิกเอกสารได้เพียงครั้งเดียว**
    - **Validates: Requirements 6.6**

  - [ ]* 9.10 เขียน property test สำหรับ round-trip ของการบันทึกและการยกเลิก
    - **Property 14: บันทึกแล้วยกเลิกคืนยอดคงเหลือกลับสู่ค่าเดิม (round-trip)**
    - **Validates: Requirements 6.9**

  - [ ]* 9.11 เขียน property test สำหรับตัวกรองและค่าที่คำนวณของยอดคงเหลือ
    - **Property 21: ตัวกรองยอดคงเหลือคืนเฉพาะรายการที่ตรงเงื่อนไข และค่าที่คำนวณถูกต้อง**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6, 4.9**

  - [ ]* 9.12 เขียน property test สำหรับตัวกรองและการเรียงลำดับประวัติความเคลื่อนไหว
    - **Property 22: ตัวกรองและการเรียงลำดับประวัติความเคลื่อนไหวถูกต้อง**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.10**

  - [ ]* 9.13 เขียน property test สำหรับการแบ่งหน้า
    - **Property 23: การแบ่งหน้าครบถ้วนและไม่ซ้ำซ้อน**
    - **Validates: Requirements 4.2, 5.5**

  - [ ]* 9.14 เขียน property test สำหรับรายละเอียดยอดคงเหลือของสินค้ารายการเดียว
    - **Property 24: รายละเอียดยอดคงเหลือของสินค้ารายการเดียวคืนความเคลื่อนไหวล่าสุดอย่างถูกต้อง**
    - **Validates: Requirements 4.7**

  - [ ]* 9.15 เขียน property test สำหรับการอ่านเอกสารกลับ
    - **Property 25: อ่านเอกสารกลับได้ตรงกับที่บันทึก (round-trip)**
    - **Validates: Requirements 5.6**

  - [ ]* 9.16 เขียน property test สำหรับการยืนยันตัวตนทุกเส้นทาง
    - ไฟล์นี้ต้องไม่ mock `authenticate` ในกรณีทดสอบข้อนี้ ให้ใช้ middleware จริงและส่ง header ที่ไม่ถูกต้อง
    - **Property 27: ทุกเส้นทางของ Stock_API ต้องยืนยันตัวตน**
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 9.17 เขียน property test สำหรับการบังคับสิทธิ์ตามบทบาท
    - ต้องปล่อยให้ `requireAdmin` ตัวจริงทำงาน (mock เฉพาะ `authenticate` ให้อ่าน role จาก header)
    - **Property 28: การบังคับสิทธิ์ตามบทบาทถูกต้องทุกเส้นทาง**
    - **Validates: Requirements 3.5, 6.7, 9.3, 9.4, 9.6**

  - [ ]* 9.18 เขียน property test สำหรับการเก็บผู้บันทึกจาก token
    - **Property 29: ผู้บันทึกถูกเก็บจาก token ของคำขอ**
    - **Validates: Requirements 9.5**

- [ ] 10. เขียน property test แบบ model-based สำหรับ invariant ของบัญชี
  - [ ]* 10.1 เขียน property test สำหรับความสัมพันธ์ยอดคงเหลือกับผลรวมของบัญชี
    - สร้าง `backend/src/__tests__/stock-ledger-invariant.property.test.ts` พร้อมโมเดลอ้างอิงในหน่วยความจำ (`Map<productId, number>` + `Array<{productId, quantity}>`) และ `operationSequenceArb` ยาว 1-10 ขั้น
    - ใช้ query ตรวจสอบ `quantity <> ISNULL(SUM(m.quantity), 0)` แบบที่ทนต่อยอดตั้งต้น (`opening + SUM(movements)`)
    - **Property 15: ยอดคงเหลือเท่ากับยอดตั้งต้นบวกผลรวมของบัญชีเสมอ**
    - **Validates: Requirements 7.3, 7.4**

  - [ ]* 10.2 เขียน property test สำหรับความสมเหตุสมผลของทุกแถวในบัญชี
    - **Property 16: ทุกแถวในบัญชีสมเหตุสมผล**
    - **Validates: Requirements 7.5, 7.7**

  - [ ]* 10.3 เขียน property test สำหรับความต่อเนื่องของยอดคงเหลือใน Stock_Card
    - **Property 17: ยอดคงเหลือของแต่ละสินค้าต่อเนื่องกันตามลำดับการบันทึก**
    - **Validates: Requirements 5.2, 7.6**

- [ ] 11. เขียน property test สำหรับการทำงานพร้อมกัน
  - [ ]* 11.1 เขียน property test สำหรับความไม่ซ้ำของเลขที่เอกสารเมื่อสร้างพร้อมกัน
    - สร้าง `backend/src/__tests__/stock-concurrency.property.test.ts` (ส่งคำขอพร้อมกันด้วย `Promise.all`, generator เล็ก, รันท้ายสุด)
    - **Property 20: เลขที่เอกสารไม่ซ้ำและเลขรันเพิ่มขึ้นภายในคู่ prefix กับวันที่**
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 11.2 เขียน property test สำหรับการจ่ายออกพร้อมกัน
    - **Property 26: การจ่ายออกพร้อมกันไม่ทำให้ยอดคงเหลือติดลบ**
    - **Validates: Requirements 2.8**

- [x] 12. เพิ่มตัวป้องกันการลบสินค้าที่มีประวัติความเคลื่อนไหว
  - [x] 12.1 แก้ `ProductService.delete` ให้ตรวจข้อมูลอ้างอิงใน `stock_movements`
    - นับจำนวน `stock_movements` ที่อ้าง `product_id` ก่อนลบ; ถ้ามากกว่า 0 → `ConflictError('ไม่สามารถลบสินค้าได้ เนื่องจากมีประวัติความเคลื่อนไหวสต็อกอยู่ {count} รายการ')`
    - แก้ `backend/src/services/product.service.ts` เท่านั้น ไม่แก้ตรรกะการอ่าน `products.quantity` ของ `dashboard.service.ts` / `report.service.ts`
    - _Requirements: 7.9_

  - [ ]* 12.2 เขียน property test สำหรับการลบสินค้าที่มีและไม่มีประวัติ
    - เพิ่มกรณีทดสอบใน `backend/src/__tests__/stock.property.test.ts`
    - **Property 18: สินค้าที่มีประวัติความเคลื่อนไหวลบไม่ได้**
    - **Validates: Requirements 7.9**

- [ ] 13. Checkpoint - ยืนยันว่า Backend และการทดสอบทั้งหมดผ่านก่อนเริ่ม Frontend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. สร้างชนิดข้อมูลและตัวเรียก API ฝั่ง Frontend
  - [x] 14.1 สร้าง `frontend/src/types/stock.types.ts` และ re-export
    - ประกาศ type ที่สอดคล้องกับ response ฝั่ง Backend: `MovementType`, `StockDocumentStatus`, `StockMovementResponse`, `StockDocumentResponse`, `CancelDocumentResponse`, `StockBalanceResponse`, `StockBalanceDetailResponse`, DTO ของฟอร์ม และชนิดของพารามิเตอร์ query
    - แก้ `frontend/src/types/index.ts` เพิ่ม re-export
    - _Requirements: 10.1, 10.8_

  - [x] 14.2 สร้าง `frontend/src/services/stockApi.ts`
    - ใช้ `api` instance เดิม (แนบ Bearer token อัตโนมัติ) ส่ง JSON ธรรมดา คืน `ApiResponse<T>` แบบเดียวกับ `productApi.ts`
    - ฟังก์ชัน: `createReceipt`, `createIssue`, `createAdjustment`, `cancelDocument`, `getDocument`, `getBalances`, `getBalanceByProductId`, `getMovements`
    - _Requirements: 10.1, 10.5, 10.6, 10.10_

- [x] 15. สร้าง hooks จัดการสถานะและตรรกะฟอร์ม
  - [x] 15.1 สร้าง `frontend/src/hooks/useStockBalances.ts`
    - จัดการ page, limit, search (debounce 300 ms), categoryId, lowStock, threshold, สถานะ loading/error, ฟังก์ชัน refetch
    - จัดการข้อผิดพลาดเครือข่ายแบบเดียวกับ `useDashboard.ts` และ retry 1 ครั้งสำหรับคำขออ่าน
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 15.2 สร้าง `frontend/src/hooks/useStockMovements.ts`
    - จัดการตัวกรอง productId, movementType, startDate, endDate และการแบ่งหน้า พร้อมสถานะ loading/error
    - _Requirements: 10.2, 10.6, 10.8_

  - [x] 15.3 สร้าง `frontend/src/hooks/useStockDocumentForm.ts`
    - reducer จัดการแถวรายการ: `addRow`, `removeRow` (คงไว้อย่างน้อย 1 แถว), `updateRow` โดยรักษาลำดับและข้อมูลของแถวที่ไม่ถูกลบ
    - ตัวตรวจสอบฝั่งลูกค้า: คำนวณสถานะ "บันทึกได้" เป็นเท็จเมื่อมีแถวที่จำนวนจ่ายออกเกินยอดคงเหลือ และให้ข้อความเตือนกำกับทุกแถวที่ไม่ผ่าน
    - ตัวแม็ปข้อผิดพลาด: แปลงคีย์รูป `items[i].{field}` จาก `error.details` ไปยังแถว i และฟิลด์ที่ตรงกัน คีย์ที่แม็ปไม่ได้จัดเป็นข้อผิดพลาดระดับฟอร์มโดยไม่สูญหาย
    - flag `submitting` สำหรับปิดปุ่มบันทึกระหว่างส่งข้อมูล และไม่ retry อัตโนมัติสำหรับ POST
    - _Requirements: 10.2, 10.3, 10.4, 10.6_

- [x] 16. สร้างคอมโพเนนต์ของ Stock_UI
  - [x] 16.1 สร้าง `components/stock/ProductPicker.tsx`
    - เลือกสินค้าจากรายการที่ `status=active` พร้อมค้นหา, `<label htmlFor>` ผูกกับ `id`, ใช้งานด้วยแป้นพิมพ์ได้
    - _Requirements: 10.3, 10.9_

  - [x] 16.2 สร้าง `components/stock/StockItemRows.tsx`
    - เพิ่ม/ลบแถวรายการ, แต่ละแถวมี `ProductPicker` + ช่องจำนวน + แสดงยอดคงเหลือปัจจุบันของสินค้าที่เลือก
    - ข้อความเตือนระดับแถวเมื่อจำนวนจ่ายออกเกินยอดคงเหลือ ผูกกับ input ด้วย `aria-describedby` + `aria-invalid`; ปุ่มลบแถวมี `aria-label` และโฟกัสด้วยแป้นพิมพ์ได้
    - _Requirements: 10.3, 10.4, 10.6, 10.9_

  - [x] 16.3 สร้าง `components/stock/StockBalanceTable.tsx`
    - คอลัมน์ชื่อสินค้า, SKU, หมวดหมู่, ยอดคงเหลือ, ราคาต่อหน่วย, มูลค่าคงเหลือ; ใช้ `<th scope="col">` และประกาศสถานะกำลังโหลดด้วย `aria-live="polite"`
    - _Requirements: 10.1, 10.2, 10.9_

  - [x] 16.4 สร้าง `components/stock/MovementFilters.tsx` และ `components/stock/MovementTable.tsx`
    - ตัวกรองสินค้า/ประเภทรายการ/ช่วงวันที่ พร้อม label ที่เข้าถึงได้
    - ตารางแสดงคอลัมน์เลขที่เอกสาร, วันที่, ประเภทรายการ, สินค้า, จำนวน, ยอดคงเหลือหลังรายการ, ผู้บันทึก
    - _Requirements: 10.8, 10.9_

  - [x] 16.5 สร้าง `components/stock/CancelDocumentDialog.tsx`
    - กล่องยืนยันพร้อมช่องกรอกเหตุผล (1-500 ตัวอักษร) เรนเดอร์เฉพาะเมื่อ `user.role === 'admin'`
    - แสดงข้อความข้อผิดพลาดจาก `error.message` เมื่อ API คืน 409/403 และไม่ redirect เมื่อได้ 403
    - _Requirements: 10.6, 10.7, 10.9_

- [x] 17. สร้างหน้าจอของ Stock_UI
  - [x] 17.1 สร้าง `pages/StockBalancePage.tsx`
    - ประกอบ `StockBalanceTable` + ช่องค้นหา + ตัวกรองหมวดหมู่ + checkbox สินค้าใกล้หมด + pagination + ปุ่มลิงก์ไปหน้ารับเข้า/จ่ายออก และ `CancelDocumentDialog` สำหรับ admin
    - _Requirements: 10.1, 10.2, 10.7_

  - [x] 17.2 สร้าง `pages/StockReceiptPage.tsx` และ `pages/StockIssuePage.tsx`
    - ใช้ `useStockDocumentForm` + `StockItemRows`; หน้ารับเข้ามีช่อง `unitCost` ต่อแถว หน้าจ่ายออกไม่มี
    - เมื่อบันทึกสำเร็จ แสดงข้อความยืนยันภาษาไทยพร้อม Document_Number และรีเฟรชยอดคงเหลือที่แสดงอยู่; ปิดปุ่มบันทึกระหว่างส่งข้อมูล
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 17.3 สร้าง `pages/StockAdjustmentPage.tsx`
    - ฟอร์มปรับยอดที่แต่ละแถวมี `countedQuantity` และ `reason`; แสดงส่วนต่างที่คำนวณได้จากยอดคงเหลือปัจจุบัน
    - _Requirements: 10.3, 10.5, 10.6, 10.7_

  - [x] 17.4 สร้าง `pages/StockMovementPage.tsx`
    - ประกอบ `MovementFilters` + `MovementTable` + pagination และรองรับโหมด Stock_Card เมื่อระบุสินค้า
    - _Requirements: 10.2, 10.8_

- [x] 18. เชื่อมเส้นทางและเมนูเข้ากับแอป
  - [x] 18.1 เพิ่มเส้นทางสต็อกใน `frontend/src/App.tsx`
    - `/stock/balances`, `/stock/receipts/new`, `/stock/issues/new`, `/stock/movements` ภายใต้ `ProtectedRoute` เดิม และ `/stock/adjustments/new` ด้วย `ProtectedRoute requiredRole="admin"`
    - _Requirements: 10.7, 10.10_

  - [x] 18.2 เพิ่มเมนูสต็อกใน `frontend/src/components/Layout.tsx`
    - เพิ่ม `สต็อก` (`/stock/balances`) ใน `navItems` และ `ปรับยอดสต็อก` (`/stock/adjustments/new`) ใน `adminItems` ที่เรนเดอร์ภายใต้เงื่อนไข `user?.role === 'admin'` ที่มีอยู่แล้ว
    - _Requirements: 10.7_

- [x] 19. ติดตั้งชุดทดสอบฝั่ง Frontend (ยังไม่มี test runner ในโปรเจกต์)
  - [x] 19.1 เพิ่ม devDependencies และ config สำหรับ vitest
    - แก้ `frontend/package.json` เพิ่มแบบตรึงเวอร์ชัน: `vitest@1.6.0`, `@vitest/ui@1.6.0`, `jsdom@24.1.0`, `@testing-library/react@15.0.7`, `@testing-library/user-event@14.5.2`, `@testing-library/jest-dom@6.4.5`, `fast-check@3.22.0`
    - เพิ่มสคริปต์ `"test": "vitest --run"` (ใช้ `--run` เพื่อไม่เข้าโหมด watch)
    - ตั้งค่า `test` ใน `vite.config.ts` (`environment: 'jsdom'`, `globals: true`, `setupFiles`) และสร้างไฟล์ setup ที่ import `@testing-library/jest-dom`
    - _Requirements: 10.1, 10.9_

- [ ] 20. เขียนการทดสอบฝั่ง Frontend
  - [ ]* 20.1 เขียน property test สำหรับการเพิ่ม/ลบแถวรายการ
    - สร้าง `frontend/src/__tests__/stock-form.property.test.ts` (fast-check, `{ numRuns: 100 }`, ทดสอบ reducer แบบ pure)
    - **Property 30: การเพิ่มและลบแถวรายการในฟอร์มให้จำนวนแถวที่ถูกต้อง**
    - **Validates: Requirements 10.3**

  - [ ]* 20.2 เขียน property test สำหรับการปิดการบันทึกเมื่อจำนวนเกินยอดคงเหลือ
    - **Property 31: ฟอร์มจ่ายออกปิดการบันทึกเมื่อจำนวนเกินยอดคงเหลือ**
    - **Validates: Requirements 10.4**

  - [ ]* 20.3 เขียน property test สำหรับการแม็ปรายละเอียดข้อผิดพลาด
    - **Property 32: การแม็ปรายละเอียดข้อผิดพลาดไปยังฟิลด์ที่เกี่ยวข้อง**
    - **Validates: Requirements 10.6**

  - [ ]* 20.4 เขียน component test ของ Stock_UI
    - สร้าง `frontend/src/__tests__/stock-ui.test.tsx` ด้วย `@testing-library/react` และ mock โมดูล `stockApi` ทั้งโมดูล
    - ตรวจ: คอลัมน์และตัวควบคุมของหน้ายอดคงเหลือ (10.1), ตัวบ่งชี้กำลังโหลดและปุ่มบันทึกที่ถูกปิด (10.2), ข้อความยืนยันพร้อม Document_Number หลังบันทึกสำเร็จ (10.5), การซ่อนเมนูปรับยอดและปุ่มยกเลิกเมื่อ role เป็น `user` (10.7), คอลัมน์และตัวกรองของหน้าประวัติ (10.8), การนำไปหน้าเข้าสู่ระบบเมื่อไม่มี session (10.10)
    - _Requirements: 10.1, 10.2, 10.5, 10.7, 10.8, 10.10_

  - [ ]* 20.5 เขียน property test สำหรับชื่อที่เข้าถึงได้ขององค์ประกอบที่รับการโต้ตอบ
    - **Property 33: ทุกองค์ประกอบที่รับการโต้ตอบมีชื่อที่เข้าถึงได้**
    - **Validates: Requirements 10.9**

- [ ] 21. Final checkpoint - ยืนยันว่าการทดสอบทั้ง Backend และ Frontend ผ่านทั้งหมด
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- งานที่มีเครื่องหมาย `*` เป็นงานทดสอบที่ข้ามได้เพื่อทำ MVP ให้เร็วขึ้น งานที่ไม่มีเครื่องหมายเป็นงานหลักที่ต้องทำ
- คุณสมบัติ 1-33 ในเอกสารออกแบบถูกกระจายเป็นงานย่อยละ 1 คุณสมบัติ ครบทั้ง 33 ข้อและไม่ซ้ำกัน: Property 1, 2, 3, 5, 19 อยู่ในงาน 3.4-3.8 (`stock-ledger.property.test.ts`), Property 4, 6-14, 21-25, 27-29 อยู่ในงาน 9.1-9.18 และ Property 18 อยู่ในงาน 12.2 (`stock.property.test.ts`), Property 15-17 อยู่ในงาน 10.1-10.3 (`stock-ledger-invariant.property.test.ts`), Property 20 และ 26 อยู่ในงาน 11.1-11.2 (`stock-concurrency.property.test.ts`), Property 30-32 อยู่ในงาน 20.1-20.3 (`stock-form.property.test.ts`) และ Property 33 อยู่ในงาน 20.5 (`stock-ui.test.tsx`)
- ทุก property test ต้องรันด้วย `{ numRuns: 100 }` และมีคอมเมนต์กำกับรูปแบบ `// Feature: stock-management, Property N: <ชื่อคุณสมบัติ>`
- ห้ามใช้รูปแบบ "ข้ามรอบเมื่อ status ไม่ตรงคาด" (`if (res.status !== 201) return;`) ใช้ `fc.pre(...)` เมื่อจำเป็นต้องกรอง input จริง ๆ เท่านั้น
- งาน 5.1 กำหนดแบบแผนการใช้ `sql.Transaction` เป็นครั้งแรกของโค้ดเบส งานที่เขียนข้อมูลทุกงานหลังจากนั้น (5.3-5.5) ต้องเรียกใช้ตัวช่วยชุดเดียวกันนี้
- งาน 19.1 ต้องเสร็จก่อนงาน 20.x ทุกงาน เพราะ `frontend` ยังไม่มี test runner
- ลำดับการรันทดสอบที่แนะนำระหว่างพัฒนา: `stock-ledger.property.test.ts` → `stock-schema.smoke.test.ts` → `stock.api.test.ts` → `stock.property.test.ts` และ `stock-ledger-invariant.property.test.ts` → `stock-concurrency.property.test.ts` → การทดสอบฝั่ง Frontend

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "14.1", "19.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1", "14.2"] },
    { "id": 2, "tasks": ["3.2", "5.1", "15.1"] },
    { "id": 3, "tasks": ["3.3", "5.2", "15.2", "16.1"] },
    { "id": 4, "tasks": ["3.4", "5.3", "15.3", "16.2"] },
    { "id": 5, "tasks": ["3.5", "5.4", "16.3", "20.1"] },
    { "id": 6, "tasks": ["3.6", "5.5", "16.4", "20.2"] },
    { "id": 7, "tasks": ["3.7", "5.6", "16.5", "20.3"] },
    { "id": 8, "tasks": ["3.8", "5.7", "17.1"] },
    { "id": 9, "tasks": ["3.9", "6.1", "17.2"] },
    { "id": 10, "tasks": ["6.2", "17.3"] },
    { "id": 11, "tasks": ["6.3", "17.4"] },
    { "id": 12, "tasks": ["8.1", "18.1"] },
    { "id": 13, "tasks": ["8.2", "18.2"] },
    { "id": 14, "tasks": ["8.3", "20.4"] },
    { "id": 15, "tasks": ["9.1", "20.5"] },
    { "id": 16, "tasks": ["9.2", "12.1"] },
    { "id": 17, "tasks": ["9.3", "10.1"] },
    { "id": 18, "tasks": ["9.4", "10.2", "11.1"] },
    { "id": 19, "tasks": ["9.5", "10.3", "11.2"] },
    { "id": 20, "tasks": ["9.6"] },
    { "id": 21, "tasks": ["9.7"] },
    { "id": 22, "tasks": ["9.8"] },
    { "id": 23, "tasks": ["9.9"] },
    { "id": 24, "tasks": ["9.10"] },
    { "id": 25, "tasks": ["9.11"] },
    { "id": 26, "tasks": ["9.12"] },
    { "id": 27, "tasks": ["9.13"] },
    { "id": 28, "tasks": ["9.14"] },
    { "id": 29, "tasks": ["9.15"] },
    { "id": 30, "tasks": ["9.16"] },
    { "id": 31, "tasks": ["9.17"] },
    { "id": 32, "tasks": ["9.18"] },
    { "id": 33, "tasks": ["12.2"] }
  ]
}
```
