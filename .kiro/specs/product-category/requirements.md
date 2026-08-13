# Requirements Document

## Introduction

ระบบแยกประเภทสินค้า (Product Category) สำหรับระบบจัดการคลังสินค้า เพื่อให้ผู้ใช้งานสามารถจัดกลุ่มสินค้าเป็นหมวดหมู่ได้อย่างเป็นระบบ รองรับโครงสร้างแบบลำดับชั้น (hierarchical) เพื่อให้สามารถแบ่งหมวดหมู่ย่อยได้ และเชื่อมโยงกับระบบ SKU ที่มีอยู่เดิม

## Glossary

- **Category_Service**: บริการจัดการหมวดหมู่สินค้าในระบบ รับผิดชอบการสร้าง แก้ไข ลบ และค้นหาหมวดหมู่
- **Category**: ข้อมูลหมวดหมู่สินค้าที่ประกอบด้วย ชื่อ, รหัส (code), คำอธิบาย, สถานะ, และ parent category (ถ้ามี)
- **Parent_Category**: หมวดหมู่หลักที่มีหมวดหมู่ย่อยอยู่ภายใต้
- **Sub_Category**: หมวดหมู่ย่อยที่อยู่ภายใต้หมวดหมู่หลัก
- **Category_Code**: รหัสตัวอักษร 2-10 ตัว ที่ใช้แทนหมวดหมู่ในระบบ SKU
- **Authenticated_User**: ผู้ใช้งานที่ผ่านการยืนยันตัวตนแล้ว
- **Product_Service**: บริการจัดการข้อมูลสินค้าที่มีอยู่เดิมในระบบ

## Requirements

### Requirement 1: สร้างหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการสร้างหมวดหมู่สินค้าใหม่ เพื่อจัดกลุ่มสินค้าได้อย่างเป็นระบบ

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอสร้างหมวดหมู่พร้อมชื่อ (1-100 ตัวอักษร, อนุญาตภาษาไทย ภาษาอังกฤษ ตัวเลข และช่องว่าง) และ Category_Code (2-10 ตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ A-Z เท่านั้น), THE Category_Service SHALL สร้าง Category ใหม่และคืนข้อมูล Category ที่สร้างสำเร็จ ประกอบด้วย id, name, category_code, parent_id, created_at ภายใน 2 วินาที
2. WHEN Authenticated_User ส่งคำขอสร้างหมวดหมู่พร้อมระบุ parent_id และข้อมูลชื่อและ Category_Code ที่ผ่านการตรวจสอบ, THE Category_Service SHALL สร้าง Sub_Category ที่เชื่อมโยงกับ Parent_Category ที่ระบุ โดย Sub_Category ต้องมีระดับความลึกไม่เกิน 3 ระดับนับจาก Root_Category
3. IF Category_Code ที่ส่งมาซ้ำกับที่มีอยู่ในระบบ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT พร้อมข้อความระบุว่ารหัสหมวดหมู่ซ้ำ
4. IF parent_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความระบุว่าไม่พบหมวดหมู่หลัก
5. IF ข้อมูลที่ส่งมาไม่ผ่านการตรวจสอบ (ชื่อว่างหรือเกิน 100 ตัวอักษร, Category_Code ไม่ตรงรูปแบบ A-Z หรือไม่อยู่ในช่วง 2-10 ตัวอักษร), THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมระบุชื่อฟิลด์และเงื่อนไขที่ไม่ผ่านสำหรับแต่ละฟิลด์ที่มีปัญหา
6. IF Authenticated_User ส่งคำขอสร้าง Sub_Category ที่จะทำให้ระดับความลึกเกิน 3 ระดับ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความระบุว่าเกินจำนวนระดับความลึกสูงสุดที่อนุญาต

### Requirement 2: ดูรายการหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการดูรายการหมวดหมู่ทั้งหมด เพื่อเลือกหมวดหมู่สำหรับสินค้าได้

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอดูรายการหมวดหมู่, THE Category_Service SHALL คืนรายการ Category ทั้งหมดในรูปแบบโครงสร้างต้นไม้ (tree structure) โดยแสดง Sub_Category ภายใต้ Parent_Category พร้อมข้อมูลในแต่ละรายการประกอบด้วย id, name, code, description, parent_id, status, created_at และ updated_at
2. WHEN Authenticated_User ส่งคำขอดูรายการหมวดหมู่พร้อมพารามิเตอร์ flat=true, THE Category_Service SHALL คืนรายการ Category ทั้งหมดในรูปแบบแบนราบ (flat list) เรียงตามลำดับชั้นจาก Parent_Category ไปยัง Sub_Category
3. WHEN Authenticated_User ส่งคำขอดูรายการหมวดหมู่พร้อมพารามิเตอร์ search (1-100 ตัวอักษร), THE Category_Service SHALL คืนเฉพาะ Category ที่ชื่อหรือ Category_Code มีข้อความตรงกับคำค้นหาแบบ partial match โดยไม่คำนึงถึงตัวพิมพ์เล็ก-ใหญ่ (case-insensitive)
4. WHEN Authenticated_User ส่งคำขอดูรายการหมวดหมู่พร้อมพารามิเตอร์ status เป็น active หรือ inactive, THE Category_Service SHALL คืนเฉพาะ Category ที่มีสถานะตรงตามที่ระบุ
5. IF Authenticated_User ส่งพารามิเตอร์ status ที่ไม่ใช่ active หรือ inactive, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความระบุค่าสถานะที่ไม่ถูกต้อง
6. IF ไม่มี Category ใดตรงตามเงื่อนไขการค้นหาหรือการกรอง, THEN THE Category_Service SHALL คืนรายการว่าง (empty array) โดยไม่ถือเป็นข้อผิดพลาด

### Requirement 3: ดูรายละเอียดหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการดูรายละเอียดหมวดหมู่แต่ละรายการ เพื่อตรวจสอบข้อมูลและสินค้าในหมวดหมู่

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอดูรายละเอียดหมวดหมู่ด้วย category_id, THE Category_Service SHALL คืนข้อมูล Category (ทุกฟิลด์ตาม Requirement 8) พร้อมรายการ Sub_Category ระดับถัดไป (1 ระดับ), ข้อมูล Parent_Category (ถ้าเป็น Sub_Category), และจำนวนสินค้าที่ผูกตรงกับหมวดหมู่นี้เท่านั้น (ไม่รวมสินค้าใน Sub_Category)
2. IF category_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความระบุว่าไม่พบหมวดหมู่
3. IF category_id ที่ส่งมาไม่อยู่ในรูปแบบ UUID ที่ถูกต้อง, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความระบุว่ารูปแบบ category_id ไม่ถูกต้อง

### Requirement 4: แก้ไขหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการแก้ไขข้อมูลหมวดหมู่ เพื่อปรับปรุงให้ถูกต้องและเป็นปัจจุบัน

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอแก้ไขหมวดหมู่ด้วย category_id พร้อมข้อมูลที่ต้องการแก้ไข (name, code, description, parent_id), THE Category_Service SHALL อัปเดตเฉพาะฟิลด์ที่ส่งมาและคืนข้อมูล Category ที่อัปเดตแล้ว
2. IF Category_Code ที่แก้ไขซ้ำกับหมวดหมู่อื่น, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT พร้อมข้อความ "รหัสหมวดหมู่นี้มีอยู่ในระบบแล้ว"
3. IF category_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความ "ไม่พบหมวดหมู่"
4. IF Authenticated_User เปลี่ยน parent_id ให้เป็น Category ของตัวเอง หรือ Sub_Category ของตัวเอง, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความ "ไม่สามารถย้ายหมวดหมู่ไปอยู่ภายใต้ตัวเองหรือหมวดหมู่ย่อยของตัวเอง"
5. IF ข้อมูลที่ส่งมาไม่ผ่านการตรวจสอบ (name ว่างหรือเกิน 100 ตัวอักษร, code ไม่ใช่ตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ 2-10 ตัว, description เกิน 500 ตัวอักษร), THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมรายละเอียดฟิลด์ที่ไม่ผ่าน
6. IF Authenticated_User เปลี่ยน parent_id แล้วทำให้ลำดับชั้นของ Category เกิน 3 ระดับ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความ "ไม่สามารถย้ายได้เนื่องจากจะทำให้เกินจำนวนระดับชั้นสูงสุด 3 ระดับ"
7. IF parent_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความ "ไม่พบหมวดหมู่หลัก"

### Requirement 5: ลบหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการลบหมวดหมู่ที่ไม่ต้องการ เพื่อรักษาความเป็นระเบียบของข้อมูล

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอลบหมวดหมู่ด้วย category_id ที่ไม่มีสินค้าผูกอยู่และไม่มี Sub_Category, THE Category_Service SHALL ลบ Category ออกจากระบบอย่างถาวร (hard delete) และคืนข้อความยืนยันการลบสำเร็จ
2. IF Category ที่ต้องการลบมีสินค้าผูกอยู่อย่างน้อย 1 รายการ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT พร้อมข้อความระบุว่าไม่สามารถลบหมวดหมู่ที่มีสินค้าอยู่
3. IF Category ที่ต้องการลบมี Sub_Category อย่างน้อย 1 รายการ, THEN THE Category_Service SHALL ปฏิเสธคำขอและคืนข้อผิดพลาดรหัส CONFLICT พร้อมข้อความระบุว่าไม่สามารถลบหมวดหมู่ที่มีหมวดหมู่ย่อยอยู่
4. IF category_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความระบุว่าไม่พบหมวดหมู่
5. IF category_id ที่ส่งมาไม่อยู่ในรูปแบบ UUID ที่ถูกต้อง, THEN THE Category_Service SHALL คืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมรายละเอียดข้อผิดพลาด

### Requirement 6: เปลี่ยนสถานะหมวดหมู่สินค้า

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการเปลี่ยนสถานะหมวดหมู่ (active/inactive) เพื่อควบคุมการแสดงผลโดยไม่ต้องลบข้อมูล

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอเปลี่ยนสถานะหมวดหมู่เป็น inactive, THE Category_Service SHALL อัปเดตสถานะ Category เป็น inactive และคืนข้อมูล Category ที่อัปเดตแล้ว
2. WHEN Authenticated_User ส่งคำขอเปลี่ยนสถานะหมวดหมู่เป็น active, THE Category_Service SHALL อัปเดตสถานะ Category เป็น active และคืนข้อมูล Category ที่อัปเดตแล้ว
3. IF category_id ที่ระบุไม่มีอยู่ในระบบ, THEN THE Category_Service SHALL คืนข้อผิดพลาดรหัส NOT_FOUND พร้อมข้อความ "ไม่พบหมวดหมู่"

### Requirement 7: ผูกสินค้ากับหมวดหมู่

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการผูกสินค้ากับหมวดหมู่ที่เป็นข้อมูลจากตาราง categories เพื่อให้ระบบ category เชื่อมโยงกับสินค้าอย่างถูกต้อง

#### Acceptance Criteria

1. WHEN Authenticated_User สร้างหรือแก้ไขสินค้าพร้อมระบุ category_id, THE Product_Service SHALL ตรวจสอบว่า category_id มีอยู่ในตาราง categories และมีสถานะ active ก่อนบันทึกข้อมูลสินค้า โดย category_id เป็นฟิลด์บังคับสำหรับการสร้างสินค้า และเป็นฟิลด์ทางเลือกสำหรับการแก้ไข
2. IF category_id ที่ระบุไม่มีอยู่ในตาราง categories หรือมีสถานะ inactive, THEN THE Product_Service SHALL ปฏิเสธคำขอทั้งหมดโดยไม่บันทึกข้อมูลใดๆ และคืนข้อผิดพลาดรหัส VALIDATION_ERROR พร้อมข้อความที่ระบุว่าหมวดหมู่ที่เลือกไม่สามารถใช้งานได้
3. WHEN Product_Service สร้างรหัส SKU อัตโนมัติ, THE Product_Service SHALL ดึงค่า category_code จากตาราง categories ตาม category_id ที่ระบุ และสร้าง SKU ในรูปแบบ {category_code}-{running number 5 หลัก} เช่น ELEC-00001 โดยหมายเลขต่อจากรหัสล่าสุดที่มีอยู่ในระบบภายใต้ category_code เดียวกัน
4. IF category ที่ระบุไม่มีค่า category_code ในตาราง categories (เป็นค่าว่างหรือ null), THEN THE Product_Service SHALL ใช้รหัส "MISC" เป็นค่าเริ่มต้นสำหรับการสร้าง SKU

### Requirement 8: โครงสร้างข้อมูลหมวดหมู่

**User Story:** ในฐานะผู้ใช้งานระบบคลังสินค้า ฉันต้องการให้หมวดหมู่มีข้อมูลครบถ้วน เพื่อใช้ในการจัดการและค้นหาสินค้าได้สะดวก

#### Acceptance Criteria

1. THE Category SHALL ประกอบด้วยฟิลด์: id (UUID), name (1-100 ตัวอักษร, ไม่ซ้ำกันภายใน parent_id เดียวกัน), code (2-10 ตัวอักษรภาษาอังกฤษพิมพ์ใหญ่, ไม่ซ้ำกันทั้งระบบ), description (0-500 ตัวอักษร), parent_id (UUID หรือ null), status (active หรือ inactive), created_at (timestamp), updated_at (timestamp)
2. THE Category_Code SHALL ประกอบด้วยตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ (A-Z) เท่านั้น ยาว 2-10 ตัวอักษร
3. THE Category SHALL มีลำดับชั้นสูงสุดไม่เกิน 3 ระดับ (หมวดหมู่หลัก > หมวดหมู่ย่อย > หมวดหมู่ย่อยระดับ 2)
4. IF parent_id ถูกระบุแต่ไม่ตรงกับ id ของหมวดหมู่ที่มีอยู่ในระบบ, THEN THE System SHALL ปฏิเสธการสร้างหรือแก้ไขหมวดหมู่ พร้อมแสดงข้อความแจ้งว่าหมวดหมู่หลักที่อ้างอิงไม่มีอยู่ในระบบ
5. IF การสร้างหรือแก้ไขหมวดหมู่จะทำให้ลำดับชั้นเกิน 3 ระดับ, THEN THE System SHALL ปฏิเสธการดำเนินการ พร้อมแสดงข้อความแจ้งว่าเกินจำนวนระดับลำดับชั้นสูงสุดที่กำหนด
6. IF มีการสร้างหมวดหมู่ที่มี code ซ้ำกับหมวดหมู่ที่มีอยู่แล้วในระบบ, THEN THE System SHALL ปฏิเสธการสร้าง พร้อมแสดงข้อความแจ้งว่า code นี้ถูกใช้งานแล้ว
