# Requirements Document

## Introduction

ระบบจัดการสต็อก (Stock Management) สำหรับระบบจัดการคลังสินค้า เพื่อให้ผู้ใช้งานสามารถบันทึกการรับสินค้าเข้าคลัง จ่ายสินค้าออกจากคลัง ปรับยอดสินค้าให้ตรงกับการนับจริง และตรวจสอบยอดคงเหลือพร้อมประวัติความเคลื่อนไหวของสินค้าแต่ละรายการได้

ระบบนี้ต่อยอดจากระบบสินค้า (products) และระบบหมวดหมู่ (categories) ที่มีอยู่เดิม โดยเพิ่มบัญชีแยกประเภทความเคลื่อนไหวสต็อก (stock movement ledger) แบบเขียนแล้วไม่แก้ไข (append-only) เพื่อให้ยอดคงเหลือของสินค้าตรวจสอบย้อนกลับได้ทุกรายการ และยังคงใช้ฟิลด์ `products.quantity` เป็นยอดคงเหลือปัจจุบัน (cached balance) เพื่อความเข้ากันได้กับรายงานและ Dashboard เดิม

ระบบทำงานบนสถาปัตยกรรมเดิมของโปรเจกต์: Backend เป็น Node.js + Express + TypeScript + MSSQL (mssql package), ยืนยันตัวตนด้วย JWT Bearer token ผ่าน `authenticate` middleware, ตรวจสอบสิทธิ์ผู้ดูแลระบบผ่าน `requireAdmin` middleware, และ Frontend เป็น React + TypeScript + Vite

## Glossary

- **Stock_Service**: บริการจัดการสต็อกสินค้าฝั่ง backend รับผิดชอบการบันทึกรับเข้า จ่ายออก ปรับยอด คำนวณยอดคงเหลือ และคืนประวัติความเคลื่อนไหว
- **Stock_API**: ชุด HTTP endpoint ภายใต้เส้นทาง `/api/stock` ที่เปิดให้เรียกใช้ความสามารถของ Stock_Service
- **Stock_UI**: ส่วนติดต่อผู้ใช้ฝั่ง Frontend สำหรับจัดการสต็อก ประกอบด้วยหน้ายอดคงเหลือ หน้าบันทึกรับเข้า หน้าบันทึกจ่ายออก หน้าปรับยอด และหน้าประวัติความเคลื่อนไหว
- **Product**: ข้อมูลสินค้าในตาราง `products` ที่มีอยู่เดิม ประกอบด้วย id, name, sku, category, category_id, quantity, unit_price, status
- **Product_Service**: บริการจัดการข้อมูลสินค้าที่มีอยู่เดิมในระบบ
- **Stock_Movement**: รายการบันทึกความเคลื่อนไหวสต็อก 1 บรรทัด ประกอบด้วยประเภทรายการ, สินค้า, จำนวน, ยอดคงเหลือก่อนและหลังรายการ, ผู้บันทึก และเวลาที่บันทึก
- **Movement_Type**: ประเภทของ Stock_Movement มีค่าที่เป็นไปได้ 4 ค่า คือ `receipt` (รับเข้า), `issue` (จ่ายออก), `adjustment` (ปรับยอด) และ `reversal` (กลับรายการ)
- **Receipt**: เอกสารรับสินค้าเข้าคลัง 1 ฉบับ ประกอบด้วยหัวเอกสารและรายการสินค้าอย่างน้อย 1 รายการ
- **Issue**: เอกสารจ่ายสินค้าออกจากคลัง 1 ฉบับ ประกอบด้วยหัวเอกสารและรายการสินค้าอย่างน้อย 1 รายการ
- **Adjustment**: เอกสารปรับยอดสินค้าให้ตรงกับจำนวนที่นับได้จริง 1 ฉบับ ประกอบด้วยหัวเอกสารและรายการสินค้าอย่างน้อย 1 รายการ
- **Stock_Document**: คำเรียกรวมของ Receipt, Issue และ Adjustment
- **Document_Number**: เลขที่เอกสารที่ระบบสร้างอัตโนมัติและไม่ซ้ำกันทั้งระบบ
- **On_Hand_Balance**: ยอดคงเหลือปัจจุบันของ Product 1 รายการ มีค่าเท่ากับฟิลด์ `products.quantity`
- **Stock_Card**: ประวัติความเคลื่อนไหวสต็อกของ Product 1 รายการ เรียงตามลำดับเวลา พร้อมยอดคงเหลือสะสมของแต่ละรายการ
- **Reversal**: Stock_Movement ที่ระบบสร้างขึ้นเพื่อหักกลบผลของ Stock_Document ที่ถูกยกเลิก
- **Low_Stock_Threshold**: จำนวนคงเหลือขั้นต่ำที่ใช้เป็นเกณฑ์แจ้งเตือนสินค้าใกล้หมด ค่าเริ่มต้นเท่ากับ 10
- **Authenticated_User**: ผู้ใช้งานที่ผ่านการยืนยันตัวตนด้วย JWT Bearer token และมีสถานะ active
- **Admin_User**: Authenticated_User ที่มี role เท่ากับ `admin`

## Requirements

### Requirement 1: บันทึกรับสินค้าเข้าคลัง

**User Story:** ในฐานะ Authenticated_User ฉันต้องการบันทึกการรับสินค้าเข้าคลัง เพื่อให้ยอดคงเหลือในระบบตรงกับสินค้าที่รับเข้ามาจริง

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอสร้าง Receipt พร้อมรายการสินค้า 1-100 รายการ โดยแต่ละรายการระบุ product_id (UUID ที่มีอยู่ในตาราง products) และ quantity (จำนวนเต็ม 1-999999), THE Stock_Service SHALL สร้าง Receipt พร้อม Stock_Movement ประเภท `receipt` ครบทุกรายการ เพิ่ม On_Hand_Balance ของแต่ละ Product ตามจำนวนที่ระบุ และคืนข้อมูลเอกสารที่ประกอบด้วย id, document_number, document_date, note, created_by, created_at และรายการสินค้าทั้งหมดพร้อม balance_before และ balance_after
2. WHERE คำขอสร้าง Receipt ระบุ unit_cost ของรายการสินค้า (ทศนิยม 0-999999999.99 ไม่เกิน 2 ตำแหน่ง), THE Stock_Service SHALL บันทึกค่า unit_cost ไว้ในรายการ Stock_Movement นั้นและคืนค่าดังกล่าวในผลลัพธ์
3. WHERE คำขอสร้าง Receipt ไม่ระบุ document_date, THE Stock_Service SHALL ใช้เวลาปัจจุบันตามมาตรฐาน UTC เป็น document_date
4. WHEN Stock_Service บันทึก Receipt สำเร็จ, THE Stock_Service SHALL บันทึกทุกรายการและปรับ On_Hand_Balance ทุกรายการภายใน database transaction เดียว เพื่อให้ผลลัพธ์เป็นสำเร็จทั้งหมดหรือไม่เกิดการเปลี่ยนแปลงใดเลย
5. IF product_id รายการใดในคำขอไม่มีอยู่ในตาราง products, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับโดยไม่บันทึกข้อมูลใด และคืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความระบุ product_id ที่ไม่พบ
6. IF Product รายการใดในคำขอมีสถานะ `inactive`, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับโดยไม่บันทึกข้อมูลใด และคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความระบุว่าสินค้ารายการนั้นไม่อยู่ในสถานะที่รับเข้าได้
7. IF คำขอสร้าง Receipt มีรายการสินค้าเป็นรายการว่าง หรือ quantity ของรายการใดไม่ใช่จำนวนเต็มในช่วง 1-999999, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมระบุลำดับรายการและชื่อฟิลด์ที่ไม่ผ่านการตรวจสอบทุกฟิลด์
8. IF ผลรวมของ On_Hand_Balance เดิมกับจำนวนที่รับเข้าของ Product รายการใดมากกว่า 999999, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความระบุว่ายอดคงเหลือเกินค่าสูงสุดที่ระบบรองรับ
9. IF คำขอสร้าง Receipt ระบุ product_id ซ้ำกันมากกว่า 1 รายการ, THEN THE Stock_Service SHALL รวมจำนวนของรายการที่ซ้ำกันเข้าด้วยกันเป็นรายการเดียวก่อนบันทึก และคืนผลลัพธ์เป็นรายการที่รวมแล้ว

### Requirement 2: บันทึกจ่ายสินค้าออกจากคลัง

**User Story:** ในฐานะ Authenticated_User ฉันต้องการบันทึกการจ่ายสินค้าออกจากคลัง เพื่อให้ยอดคงเหลือลดลงตามสินค้าที่จ่ายออกไปจริง

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอสร้าง Issue พร้อมรายการสินค้า 1-100 รายการ โดยแต่ละรายการระบุ product_id (UUID ที่มีอยู่ในตาราง products) และ quantity (จำนวนเต็ม 1-999999) ที่ไม่เกิน On_Hand_Balance ของ Product นั้น, THE Stock_Service SHALL สร้าง Issue พร้อม Stock_Movement ประเภท `issue` ครบทุกรายการ ลด On_Hand_Balance ของแต่ละ Product ตามจำนวนที่ระบุ และคืนข้อมูลเอกสารที่ประกอบด้วย id, document_number, document_date, note, created_by, created_at และรายการสินค้าทั้งหมดพร้อม balance_before และ balance_after
2. WHEN Stock_Service บันทึก Issue สำเร็จ, THE Stock_Service SHALL บันทึกทุกรายการและปรับ On_Hand_Balance ทุกรายการภายใน database transaction เดียว เพื่อให้ผลลัพธ์เป็นสำเร็จทั้งหมดหรือไม่เกิดการเปลี่ยนแปลงใดเลย
3. IF จำนวนที่ขอจ่ายออกของ Product รายการใดมากกว่า On_Hand_Balance ของ Product นั้น, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับโดยไม่บันทึกข้อมูลใด และคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความที่ระบุ sku ของสินค้า จำนวนคงเหลือปัจจุบัน และจำนวนที่ขอจ่ายออก
4. IF product_id รายการใดในคำขอไม่มีอยู่ในตาราง products, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับโดยไม่บันทึกข้อมูลใด และคืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความระบุ product_id ที่ไม่พบ
5. IF Product รายการใดในคำขอมีสถานะ `inactive`, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับโดยไม่บันทึกข้อมูลใด และคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความระบุว่าสินค้ารายการนั้นไม่อยู่ในสถานะที่จ่ายออกได้
6. IF คำขอสร้าง Issue มีรายการสินค้าเป็นรายการว่าง หรือ quantity ของรายการใดไม่ใช่จำนวนเต็มในช่วง 1-999999, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมระบุลำดับรายการและชื่อฟิลด์ที่ไม่ผ่านการตรวจสอบทุกฟิลด์
7. IF คำขอสร้าง Issue ระบุ product_id ซ้ำกันมากกว่า 1 รายการ, THEN THE Stock_Service SHALL รวมจำนวนของรายการที่ซ้ำกันเข้าด้วยกันเป็นรายการเดียวก่อนตรวจสอบยอดคงเหลือและบันทึก
8. WHILE มีคำขอจ่ายออกสินค้ารายการเดียวกันหลายคำขอเข้าสู่ระบบพร้อมกัน, THE Stock_Service SHALL ตรวจสอบยอดคงเหลือและปรับ On_Hand_Balance ภายใต้การล็อกแถวข้อมูลสินค้าแบบ serialized เพื่อให้ On_Hand_Balance หลังประมวลผลทุกคำขอมีค่ามากกว่าหรือเท่ากับ 0

### Requirement 3: ปรับยอดสินค้าคงเหลือ

**User Story:** ในฐานะ Admin_User ฉันต้องการปรับยอดสินค้าคงเหลือในระบบให้ตรงกับจำนวนที่นับได้จริง เพื่อแก้ไขความคลาดเคลื่อนของข้อมูลสต็อก

#### Acceptance Criteria

1. WHEN Admin_User ส่งคำขอสร้าง Adjustment พร้อมรายการสินค้า 1-100 รายการ โดยแต่ละรายการระบุ product_id, counted_quantity (จำนวนเต็ม 0-999999) และ reason (1-500 ตัวอักษร), THE Stock_Service SHALL สร้าง Adjustment พร้อม Stock_Movement ประเภท `adjustment` ครบทุกรายการ ตั้งค่า On_Hand_Balance ของแต่ละ Product ให้เท่ากับ counted_quantity และคืนข้อมูลเอกสารพร้อมรายการที่ระบุ balance_before, balance_after และ difference ของแต่ละรายการ
2. THE Stock_Service SHALL คำนวณค่า difference ของแต่ละรายการ Adjustment เป็น counted_quantity ลบด้วย On_Hand_Balance ก่อนปรับยอด
3. WHEN Stock_Service บันทึก Adjustment สำเร็จ, THE Stock_Service SHALL บันทึกทุกรายการและปรับ On_Hand_Balance ทุกรายการภายใน database transaction เดียว เพื่อให้ผลลัพธ์เป็นสำเร็จทั้งหมดหรือไม่เกิดการเปลี่ยนแปลงใดเลย
4. WHEN Admin_User ส่งคำขอสร้าง Adjustment ที่มี counted_quantity เท่ากับ On_Hand_Balance ปัจจุบันของ Product นั้น, THE Stock_Service SHALL บันทึก Stock_Movement ที่มี difference เท่ากับ 0 และคง On_Hand_Balance ไว้เท่าเดิม
5. IF ผู้ส่งคำขอสร้าง Adjustment มี role เท่ากับ `user`, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส FORBIDDEN (HTTP 403) พร้อมข้อความ "สิทธิ์ไม่เพียงพอ"
6. IF รายการใดใน Adjustment ไม่ระบุ reason หรือ reason มีความยาวเกิน 500 ตัวอักษร, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมระบุลำดับรายการที่ไม่ผ่านการตรวจสอบ
7. IF counted_quantity ของรายการใดไม่ใช่จำนวนเต็มในช่วง 0-999999, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมระบุลำดับรายการและชื่อฟิลด์ที่ไม่ผ่านการตรวจสอบ
8. IF product_id รายการใดในคำขอไม่มีอยู่ในตาราง products, THEN THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับและคืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความระบุ product_id ที่ไม่พบ
9. WHEN Admin_User ส่งคำขอสร้าง Adjustment ที่มีเนื้อหาเหมือนกันซ้ำเป็นครั้งที่สองโดยไม่มีความเคลื่อนไหวอื่นคั่นกลาง, THE Stock_Service SHALL ตั้งค่า On_Hand_Balance ให้เท่ากับ counted_quantity เดิม โดย On_Hand_Balance หลังการบันทึกครั้งที่สองเท่ากับ On_Hand_Balance หลังการบันทึกครั้งแรก (คุณสมบัติ idempotent ของยอดคงเหลือ)

### Requirement 4: ดูยอดคงเหลือสินค้า

**User Story:** ในฐานะ Authenticated_User ฉันต้องการดูยอดคงเหลือของสินค้าทั้งหมด เพื่อวางแผนการรับเข้าและการจ่ายออก

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอดูยอดคงเหลือ, THE Stock_Service SHALL คืนรายการสินค้าแบบแบ่งหน้า โดยแต่ละรายการประกอบด้วย product_id, name, sku, category, category_id, on_hand_balance, unit_price, stock_value (on_hand_balance คูณ unit_price), status, last_movement_at และพร้อมข้อมูล total, page, totalPages
2. WHERE คำขอดูยอดคงเหลือระบุพารามิเตอร์ page (จำนวนเต็มตั้งแต่ 1) และ limit (จำนวนเต็ม 1-100), THE Stock_Service SHALL คืนข้อมูลตามหน้าและจำนวนรายการต่อหน้าที่ระบุ โดยใช้ค่าเริ่มต้น page เท่ากับ 1 และ limit เท่ากับ 20 เมื่อไม่ได้ระบุ
3. WHERE คำขอดูยอดคงเหลือระบุพารามิเตอร์ search (1-200 ตัวอักษร), THE Stock_Service SHALL คืนเฉพาะสินค้าที่ name หรือ sku มีข้อความตรงกับคำค้นหาแบบ partial match โดยไม่คำนึงถึงตัวพิมพ์เล็ก-ใหญ่
4. WHERE คำขอดูยอดคงเหลือระบุพารามิเตอร์ categoryId (UUID), THE Stock_Service SHALL คืนเฉพาะสินค้าที่ผูกกับหมวดหมู่ที่ระบุ
5. WHERE คำขอดูยอดคงเหลือระบุพารามิเตอร์ lowStock เท่ากับ true, THE Stock_Service SHALL คืนเฉพาะสินค้าที่ on_hand_balance น้อยกว่าหรือเท่ากับ Low_Stock_Threshold เรียงจาก on_hand_balance น้อยไปมาก
6. WHERE คำขอดูยอดคงเหลือระบุพารามิเตอร์ threshold (จำนวนเต็ม 0-999999), THE Stock_Service SHALL ใช้ค่าดังกล่าวเป็น Low_Stock_Threshold แทนค่าเริ่มต้น 10
7. WHEN Authenticated_User ส่งคำขอดูยอดคงเหลือของสินค้ารายการเดียวด้วย product_id, THE Stock_Service SHALL คืน on_hand_balance ปัจจุบันพร้อมข้อมูลสินค้าและ Stock_Movement ล่าสุด 5 รายการ
8. IF product_id ที่ระบุไม่มีอยู่ในตาราง products, THEN THE Stock_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความ "ไม่พบสินค้า"
9. IF ไม่มีสินค้าใดตรงตามเงื่อนไขการค้นหาหรือการกรอง, THEN THE Stock_Service SHALL คืนรายการว่างพร้อม total เท่ากับ 0 และ totalPages เท่ากับ 1 โดยไม่ถือเป็นข้อผิดพลาด
10. IF พารามิเตอร์การค้นหาไม่ผ่านการตรวจสอบ (page หรือ limit ไม่ใช่จำนวนเต็มบวก, limit มากกว่า 100, categoryId ไม่ใช่รูปแบบ UUID, threshold อยู่นอกช่วง 0-999999), THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมรายละเอียดฟิลด์ที่ไม่ผ่าน

### Requirement 5: ดูประวัติความเคลื่อนไหวสต็อก

**User Story:** ในฐานะ Authenticated_User ฉันต้องการดูประวัติความเคลื่อนไหวของสต็อก เพื่อตรวจสอบที่มาของยอดคงเหลือแต่ละรายการ

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอดูประวัติความเคลื่อนไหว, THE Stock_Service SHALL คืนรายการ Stock_Movement แบบแบ่งหน้า เรียงตาม created_at จากใหม่ไปเก่า โดยแต่ละรายการประกอบด้วย id, document_id, document_number, movement_type, product_id, product_name, sku, quantity, balance_before, balance_after, unit_cost, note, created_by_name และ created_at
2. WHERE คำขอดูประวัติความเคลื่อนไหวระบุพารามิเตอร์ productId (UUID), THE Stock_Service SHALL คืนเฉพาะ Stock_Movement ของสินค้ารายการนั้นเรียงตาม created_at จากเก่าไปใหม่ ในรูปแบบ Stock_Card
3. WHERE คำขอดูประวัติความเคลื่อนไหวระบุพารามิเตอร์ movementType เป็นค่าใดค่าหนึ่งใน receipt, issue, adjustment หรือ reversal, THE Stock_Service SHALL คืนเฉพาะ Stock_Movement ที่มี Movement_Type ตรงตามที่ระบุ
4. WHERE คำขอดูประวัติความเคลื่อนไหวระบุพารามิเตอร์ startDate และ endDate ในรูปแบบ YYYY-MM-DD, THE Stock_Service SHALL คืนเฉพาะ Stock_Movement ที่มี document_date อยู่ในช่วงวันที่ระบุโดยนับรวมวันเริ่มต้นและวันสิ้นสุด
5. WHERE คำขอดูประวัติความเคลื่อนไหวระบุพารามิเตอร์ page และ limit, THE Stock_Service SHALL คืนข้อมูลตามหน้าและจำนวนรายการต่อหน้าที่ระบุ โดยใช้ค่าเริ่มต้น page เท่ากับ 1 และ limit เท่ากับ 20 และรองรับ limit สูงสุด 100
6. WHEN Authenticated_User ส่งคำขอดูรายละเอียด Stock_Document ด้วย document_id, THE Stock_Service SHALL คืนหัวเอกสารพร้อมรายการสินค้าทั้งหมดของเอกสารนั้น สถานะเอกสาร และข้อมูลผู้บันทึก
7. IF startDate อยู่หลัง endDate, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความระบุว่าวันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด
8. IF movementType ที่ระบุไม่ใช่ค่าใดค่าหนึ่งใน receipt, issue, adjustment หรือ reversal, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR (HTTP 400) พร้อมข้อความระบุค่าประเภทรายการที่ไม่ถูกต้อง
9. IF document_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Stock_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความ "ไม่พบเอกสาร"
10. IF ไม่มี Stock_Movement ใดตรงตามเงื่อนไขการกรอง, THEN THE Stock_Service SHALL คืนรายการว่างพร้อม total เท่ากับ 0 โดยไม่ถือเป็นข้อผิดพลาด

### Requirement 6: ยกเลิกเอกสารสต็อกด้วยการกลับรายการ

**User Story:** ในฐานะ Admin_User ฉันต้องการยกเลิกเอกสารสต็อกที่บันทึกผิด เพื่อให้ยอดคงเหลือกลับไปเป็นค่าที่ถูกต้องโดยยังคงร่องรอยการตรวจสอบไว้

#### Acceptance Criteria

1. WHEN Admin_User ส่งคำขอยกเลิก Stock_Document ที่มีสถานะ `posted` พร้อม reason (1-500 ตัวอักษร), THE Stock_Service SHALL สร้าง Stock_Movement ประเภท `reversal` ที่มีจำนวนหักกลบทุกรายการของเอกสารเดิม เปลี่ยนสถานะเอกสารเดิมเป็น `cancelled` และปรับ On_Hand_Balance ของสินค้าทุกรายการกลับตามผลหักกลบ
2. THE Stock_Service SHALL คงข้อมูล Stock_Movement เดิมของเอกสารที่ถูกยกเลิกไว้ในระบบโดยไม่ลบและไม่แก้ไขจำนวน เพื่อรักษาร่องรอยการตรวจสอบ
3. WHEN Stock_Service ยกเลิก Stock_Document สำเร็จ, THE Stock_Service SHALL คืนข้อมูลเอกสารที่มีสถานะ `cancelled`, cancelled_by, cancelled_at, cancel_reason และรายการ Reversal ที่สร้างขึ้น
4. WHEN Stock_Service ยกเลิก Stock_Document, THE Stock_Service SHALL ดำเนินการสร้าง Reversal ทุกรายการ เปลี่ยนสถานะเอกสาร และปรับ On_Hand_Balance ภายใน database transaction เดียว เพื่อให้ผลลัพธ์เป็นสำเร็จทั้งหมดหรือไม่เกิดการเปลี่ยนแปลงใดเลย
5. WHEN Admin_User ยกเลิก Receipt ที่ทำให้ On_Hand_Balance ของสินค้ารายการใดต่ำกว่า 0, THE Stock_Service SHALL ปฏิเสธคำขอทั้งฉบับและคืนข้อผิดพลาดรหัส CONFLICT (HTTP 409) พร้อมข้อความที่ระบุ sku ของสินค้าและจำนวนคงเหลือปัจจุบัน
6. IF Stock_Document ที่ระบุมีสถานะ `cancelled` อยู่แล้ว, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT (HTTP 409) พร้อมข้อความระบุว่าเอกสารถูกยกเลิกแล้ว
7. IF ผู้ส่งคำขอยกเลิกเอกสารมี role เท่ากับ `user`, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส FORBIDDEN (HTTP 403) พร้อมข้อความ "สิทธิ์ไม่เพียงพอ"
8. IF document_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Stock_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND (HTTP 404) พร้อมข้อความ "ไม่พบเอกสาร"
9. WHEN Stock_Service ยกเลิก Stock_Document ที่ไม่มีความเคลื่อนไหวอื่นเกิดขึ้นกับสินค้าในเอกสารนั้นหลังการบันทึกเอกสาร, THE Stock_Service SHALL ทำให้ On_Hand_Balance ของสินค้าทุกรายการเท่ากับค่า balance_before ของรายการนั้นในเอกสารเดิม (คุณสมบัติ round-trip ของการบันทึกและการกลับรายการ)

### Requirement 7: ความถูกต้องของยอดคงเหลือและโครงสร้างข้อมูลสต็อก

**User Story:** ในฐานะ Authenticated_User ฉันต้องการให้ยอดคงเหลือในระบบตรงกับผลรวมของความเคลื่อนไหวทั้งหมดเสมอ เพื่อให้เชื่อถือข้อมูลสต็อกได้

#### Acceptance Criteria

1. THE Stock_Movement SHALL ประกอบด้วยฟิลด์: id (UUID), document_id (UUID), movement_type (receipt, issue, adjustment หรือ reversal), product_id (UUID อ้างอิง products.id), quantity (จำนวนเต็มที่มีเครื่องหมาย ช่วง -999999 ถึง 999999), balance_before (จำนวนเต็ม 0-999999), balance_after (จำนวนเต็ม 0-999999), unit_cost (ทศนิยม 2 ตำแหน่ง หรือ null), reason (0-500 ตัวอักษร หรือ null), created_by (UUID อ้างอิง users.id), created_at (timestamp UTC)
2. THE Stock_Document SHALL ประกอบด้วยฟิลด์: id (UUID), document_number (ไม่ซ้ำกันทั้งระบบ), document_type (receipt, issue หรือ adjustment), document_date (timestamp UTC), note (0-1000 ตัวอักษร หรือ null), status (posted หรือ cancelled), created_by (UUID), created_at (timestamp UTC), cancelled_by (UUID หรือ null), cancelled_at (timestamp UTC หรือ null), cancel_reason (0-500 ตัวอักษร หรือ null)
3. THE Stock_Service SHALL รักษาให้ On_Hand_Balance ของทุก Product เท่ากับผลรวมของฟิลด์ quantity ของ Stock_Movement ทุกรายการของ Product นั้น
4. THE Stock_Service SHALL รักษาให้ On_Hand_Balance ของทุก Product มีค่าอยู่ในช่วง 0 ถึง 999999
5. THE Stock_Service SHALL บันทึกค่า balance_after ของทุก Stock_Movement เท่ากับ balance_before บวกด้วย quantity ของรายการนั้น
6. THE Stock_Service SHALL บันทึกค่า balance_before ของ Stock_Movement แต่ละรายการเท่ากับ balance_after ของ Stock_Movement รายการก่อนหน้าของ Product เดียวกันเมื่อเรียงตามลำดับการบันทึก และเท่ากับ 0 เมื่อเป็นรายการแรกของ Product นั้น
7. THE Stock_Service SHALL บันทึก quantity ของ Stock_Movement ประเภท `receipt` เป็นจำนวนบวก และบันทึก quantity ของ Stock_Movement ประเภท `issue` เป็นจำนวนลบ
8. IF มีคำขอแก้ไขหรือลบ Stock_Movement ที่บันทึกแล้ว, THEN THE Stock_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส FORBIDDEN (HTTP 403) พร้อมข้อความระบุว่ารายการความเคลื่อนไหวแก้ไขหรือลบไม่ได้ และให้ใช้การยกเลิกเอกสารตาม Requirement 6 แทน
9. IF Authenticated_User ส่งคำขอลบ Product ที่มี Stock_Movement อยู่อย่างน้อย 1 รายการ, THEN THE Product_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT (HTTP 409) พร้อมข้อความระบุว่าสินค้ามีประวัติความเคลื่อนไหวสต็อกอยู่ จึงลบไม่ได้

### Requirement 8: เลขที่เอกสารอัตโนมัติ

**User Story:** ในฐานะ Authenticated_User ฉันต้องการให้ระบบสร้างเลขที่เอกสารให้อัตโนมัติ เพื่ออ้างอิงเอกสารสต็อกแต่ละฉบับได้อย่างไม่ซ้ำกัน

#### Acceptance Criteria

1. WHEN Stock_Service สร้าง Stock_Document, THE Stock_Service SHALL สร้าง Document_Number ในรูปแบบ {prefix}-{YYYYMMDD}-{running number 4 หลัก} โดย prefix เท่ากับ RC สำหรับ Receipt, IS สำหรับ Issue และ AJ สำหรับ Adjustment ตัวอย่างเช่น RC-20260101-0001
2. THE Stock_Service SHALL เริ่มนับ running number ที่ 0001 ใหม่สำหรับแต่ละคู่ของ prefix และวันที่ตาม UTC
3. THE Stock_Service SHALL สร้าง Document_Number ที่ไม่ซ้ำกันทั้งระบบ โดยใช้ข้อจำกัด unique constraint ระดับฐานข้อมูลบนฟิลด์ document_number
4. IF การบันทึก Stock_Document ล้มเหลวเนื่องจาก Document_Number ซ้ำจากการสร้างเอกสารพร้อมกัน, THEN THE Stock_Service SHALL สร้าง Document_Number ใหม่และพยายามบันทึกซ้ำได้สูงสุด 3 ครั้ง ก่อนคืนข้อผิดพลาดรหัส CONFLICT (HTTP 409) พร้อมข้อความระบุว่าสร้างเลขที่เอกสารไม่สำเร็จ
5. IF running number ของ prefix และวันที่หนึ่งถึง 9999 แล้ว, THEN THE Stock_Service SHALL ปฏิเสธคำขอสร้างเอกสารและคืนข้อผิดพลาดรหัส CONFLICT (HTTP 409) พร้อมข้อความระบุว่าจำนวนเอกสารของวันนั้นถึงขีดจำกัดแล้ว

### Requirement 9: การยืนยันตัวตนและสิทธิ์การเข้าถึง

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการให้เฉพาะผู้ใช้ที่ผ่านการยืนยันตัวตนเข้าถึงข้อมูลสต็อกได้ เพื่อป้องกันการเปลี่ยนแปลงยอดสินค้าโดยผู้ที่ไม่มีสิทธิ์

#### Acceptance Criteria

1. THE Stock_API SHALL ตรวจสอบ JWT Bearer token ในส่วนหัว Authorization ของทุกคำขอที่เข้าถึงเส้นทางภายใต้ `/api/stock`
2. IF คำขอไม่มีส่วนหัว Authorization หรือ token ไม่ถูกต้องหรือหมดอายุ, THEN THE Stock_API SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส UNAUTHORIZED (HTTP 401) พร้อมข้อความภาษาไทยอธิบายสาเหตุ
3. THE Stock_API SHALL อนุญาตให้ Authenticated_User ทุก role เรียกใช้การดูยอดคงเหลือ การดูประวัติความเคลื่อนไหว การบันทึก Receipt และการบันทึก Issue
4. THE Stock_API SHALL จำกัดให้เฉพาะ Admin_User เรียกใช้การบันทึก Adjustment และการยกเลิก Stock_Document
5. WHEN Stock_Service บันทึก Stock_Movement, THE Stock_Service SHALL บันทึกค่า created_by เท่ากับ user id ที่ได้จาก JWT token ของคำขอนั้น
6. IF Authenticated_User ที่ส่งคำขอมี role เท่ากับ `user` และเรียกใช้ endpoint ที่จำกัดสำหรับ Admin_User, THEN THE Stock_API SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส FORBIDDEN (HTTP 403) พร้อมข้อความ "สิทธิ์ไม่เพียงพอ"

### Requirement 10: หน้าจอผู้ใช้สำหรับจัดการสต็อก

**User Story:** ในฐานะ Authenticated_User ฉันต้องการหน้าจอสำหรับจัดการสต็อก เพื่อบันทึกรับเข้า จ่ายออก ปรับยอด และตรวจสอบยอดคงเหลือได้จากส่วนติดต่อผู้ใช้

#### Acceptance Criteria

1. WHEN Authenticated_User เปิดหน้ายอดคงเหลือ, THE Stock_UI SHALL แสดงตารางสินค้าพร้อมคอลัมน์ชื่อสินค้า, SKU, หมวดหมู่, ยอดคงเหลือ, ราคาต่อหน่วย และมูลค่าคงเหลือ พร้อมช่องค้นหา ตัวกรองหมวดหมู่ ตัวกรองสินค้าใกล้หมด และตัวควบคุมการแบ่งหน้า
2. WHILE Stock_UI กำลังรอผลลัพธ์จาก Stock_API, THE Stock_UI SHALL แสดงตัวบ่งชี้สถานะกำลังโหลดและปิดการใช้งานปุ่มบันทึกของฟอร์มที่กำลังส่งข้อมูล
3. WHEN Authenticated_User เปิดหน้าบันทึกรับเข้าหรือหน้าบันทึกจ่ายออก, THE Stock_UI SHALL แสดงฟอร์มที่เพิ่มและลบรายการสินค้าได้ โดยแต่ละรายการเลือกสินค้าจากรายการสินค้าสถานะ active และกรอกจำนวน พร้อมแสดงยอดคงเหลือปัจจุบันของสินค้าที่เลือก
4. WHEN Authenticated_User กรอกจำนวนจ่ายออกมากกว่ายอดคงเหลือปัจจุบันของสินค้าที่เลือก, THE Stock_UI SHALL แสดงข้อความแจ้งเตือนที่รายการนั้นและปิดการใช้งานปุ่มบันทึกจนกว่าจำนวนจะไม่เกินยอดคงเหลือ
5. WHEN Stock_API คืนผลสำเร็จของการบันทึก Stock_Document, THE Stock_UI SHALL แสดงข้อความยืนยันภาษาไทยพร้อม Document_Number และรีเฟรชยอดคงเหลือที่แสดงอยู่
6. IF Stock_API คืนข้อผิดพลาด, THEN THE Stock_UI SHALL แสดงข้อความข้อผิดพลาดภาษาไทยจากฟิลด์ error.message และแสดงรายละเอียดข้อผิดพลาดระดับฟิลด์จาก error.details ที่ฟิลด์ที่เกี่ยวข้อง
7. WHERE Authenticated_User มี role เท่ากับ `user`, THE Stock_UI SHALL ซ่อนเมนูปรับยอดและปุ่มยกเลิกเอกสาร
8. WHEN Authenticated_User เปิดหน้าประวัติความเคลื่อนไหว, THE Stock_UI SHALL แสดงตาราง Stock_Movement พร้อมตัวกรองสินค้า ประเภทรายการ และช่วงวันที่ และแสดงคอลัมน์เลขที่เอกสาร, วันที่, ประเภทรายการ, สินค้า, จำนวน, ยอดคงเหลือหลังรายการ และผู้บันทึก
9. THE Stock_UI SHALL รองรับการใช้งานผ่านแป้นพิมพ์สำหรับทุกองค์ประกอบที่รับการโต้ตอบ และกำหนดป้ายกำกับที่โปรแกรมอ่านหน้าจอเข้าถึงได้ให้กับทุกช่องกรอกข้อมูลและทุกปุ่ม
10. WHEN Authenticated_User เปิดหน้าใดหน้าหนึ่งของ Stock_UI โดยไม่มี session ที่ใช้งานได้, THE Stock_UI SHALL นำผู้ใช้ไปยังหน้าเข้าสู่ระบบ
