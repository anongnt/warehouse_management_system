# Requirements Document

## Introduction

ระบบจัดการ SKU (Stock Keeping Unit) สำหรับระบบบริหารจัดการคลังสินค้า ช่วยให้ผู้ใช้สามารถสร้าง แก้ไข ลบ และค้นหา SKU ได้อย่างเป็นระบบ โดย SKU เป็นรหัสเฉพาะที่ใช้ระบุสินค้าแต่ละรายการในคลัง สนับสนุนทั้งการสร้าง SKU แบบกำหนดเอง (manual) และแบบอัตโนมัติ (auto-generate) ตามหมวดหมู่สินค้า

## Glossary

- **SKU_Management_System**: ระบบจัดการรหัส SKU สำหรับสินค้าในคลัง ประกอบด้วย API Backend และ Frontend UI
- **SKU**: Stock Keeping Unit - รหัสเฉพาะที่ใช้ระบุสินค้าแต่ละรายการ ประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข เครื่องหมายขีดกลาง (-) และขีดล่าง (_) มีความยาว 1-50 ตัวอักษร
- **SKU_Generator**: ส่วนประกอบที่สร้างรหัส SKU อัตโนมัติตามรูปแบบ {CATEGORY_CODE}-{RUNNING_NUMBER}
- **Category_Code**: รหัสย่อ 4 ตัวอักษรที่แมปจากหมวดหมู่สินค้าภาษาไทย (เช่น ELEC, OFFC, TOOL)
- **Running_Number**: เลขลำดับ 5 หลักที่เพิ่มขึ้นตามลำดับภายในหมวดหมู่เดียวกัน
- **Product**: สินค้าในคลังที่มี SKU เป็นตัวระบุ
- **Validator**: ส่วนประกอบที่ตรวจสอบความถูกต้องของข้อมูล SKU
- **Authenticated_User**: ผู้ใช้ที่ผ่านการยืนยันตัวตนแล้วและมีสิทธิ์เข้าถึงระบบ

## Requirements

### Requirement 1: สร้าง SKU แบบกำหนดเอง

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการสร้าง SKU ให้กับสินค้าโดยกำหนดรหัสเอง เพื่อให้สามารถใช้รหัสที่สอดคล้องกับระบบจัดการสินค้าเดิมได้

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอสร้าง SKU พร้อมรหัส SKU ที่ถูกต้อง, THE SKU_Management_System SHALL บันทึก SKU ลงฐานข้อมูลและส่งข้อมูล SKU ที่สร้างสำเร็จกลับพร้อม HTTP status 201
2. WHEN Authenticated_User ส่งรหัส SKU ที่มีอยู่ในระบบแล้ว, THE Validator SHALL ปฏิเสธคำขอและส่งข้อความแจ้งข้อผิดพลาด "SKU นี้มีอยู่ในระบบแล้ว" พร้อม HTTP status 409
3. WHEN Authenticated_User ส่งรหัส SKU ที่มีอักขระไม่ถูกต้อง (นอกเหนือจาก a-z, A-Z, 0-9, -, _), THE Validator SHALL ปฏิเสธคำขอและส่งข้อความแจ้งข้อผิดพลาดพร้อม HTTP status 400
4. WHEN Authenticated_User ส่งรหัส SKU ที่มีความยาวเกิน 50 ตัวอักษรหรือเป็นค่าว่าง, THE Validator SHALL ปฏิเสธคำขอและส่งข้อความแจ้งข้อผิดพลาดพร้อม HTTP status 400

### Requirement 2: สร้าง SKU อัตโนมัติตามหมวดหมู่

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการให้ระบบสร้าง SKU อัตโนมัติตามหมวดหมู่สินค้า เพื่อลดความผิดพลาดจากการพิมพ์เองและให้รหัสเป็นระบบ

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอสร้าง SKU โดยไม่ระบุรหัส SKU แต่ระบุหมวดหมู่, THE SKU_Generator SHALL สร้างรหัส SKU ในรูปแบบ {CATEGORY_CODE}-{RUNNING_NUMBER} โดย Running_Number เป็นเลข 5 หลักที่เพิ่มขึ้นจากหมายเลขสูงสุดที่มีอยู่ในหมวดหมู่เดียวกัน
2. THE SKU_Generator SHALL แมปหมวดหมู่เป็น Category_Code ตามตารางที่กำหนด: อิเล็กทรอนิกส์=ELEC, อุปกรณ์สำนักงาน=OFFC, เครื่องมือช่าง=TOOL, วัสดุบรรจุภัณฑ์=PACK, อะไหล่และชิ้นส่วน=PART, เครื่องใช้ไฟฟ้า=APPL, สินค้าอุปโภคบริโภค=CONS, เคมีภัณฑ์=CHEM, วัตถุดิบ=RAWM, อื่นๆ=MISC
3. WHEN ไม่มี SKU ใดในหมวดหมู่นั้นมาก่อน, THE SKU_Generator SHALL เริ่มต้นที่หมายเลข 00001 (เช่น ELEC-00001)
4. WHEN หมวดหมู่ที่ระบุไม่ตรงกับรายการที่กำหนด, THE SKU_Generator SHALL ใช้ Category_Code เป็น "MISC"

### Requirement 3: แสดงรายการ SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการดูรายการ SKU ทั้งหมดพร้อมข้อมูลสินค้า เพื่อให้สามารถตรวจสอบและจัดการสินค้าได้สะดวก

#### Acceptance Criteria

1. WHEN Authenticated_User เรียกดูรายการ SKU, THE SKU_Management_System SHALL ส่งรายการ SKU แบบแบ่งหน้า (pagination) โดยค่าเริ่มต้นแสดงหน้าละ 20 รายการ เรียงลำดับจากวันที่สร้างล่าสุด
2. WHEN Authenticated_User ระบุคำค้นหา, THE SKU_Management_System SHALL กรองผลลัพธ์โดยค้นหาบางส่วน (partial match) ในฟิลด์ชื่อสินค้า, รหัส SKU และหมวดหมู่
3. WHEN Authenticated_User ระบุหมายเลขหน้าที่เกินจำนวนหน้าทั้งหมด, THE SKU_Management_System SHALL ส่งรายการว่างพร้อมข้อมูล pagination ที่ถูกต้อง
4. THE SKU_Management_System SHALL ส่งข้อมูล pagination กลับพร้อมผลลัพธ์ ประกอบด้วย total, page, totalPages

### Requirement 4: แก้ไขข้อมูล SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการแก้ไขข้อมูลสินค้าที่ผูกกับ SKU ได้ เพื่อให้ข้อมูลเป็นปัจจุบัน

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอแก้ไขข้อมูลสินค้าของ SKU ที่มีอยู่ในระบบ, THE SKU_Management_System SHALL อัปเดตเฉพาะฟิลด์ที่ส่งมาและส่งข้อมูลที่อัปเดตแล้วกลับพร้อม HTTP status 200
2. WHEN Authenticated_User ส่งรหัส SKU ใหม่ที่ซ้ำกับ SKU อื่นในระบบ, THE Validator SHALL ปฏิเสธคำขอและส่งข้อความแจ้งข้อผิดพลาด "SKU นี้มีอยู่ในระบบแล้ว" พร้อม HTTP status 409
3. IF Authenticated_User ส่งคำขอแก้ไข SKU ที่ไม่มีอยู่ในระบบ, THEN THE SKU_Management_System SHALL ส่งข้อความแจ้งข้อผิดพลาด "ไม่พบสินค้า" พร้อม HTTP status 404
4. WHEN Authenticated_User ไม่ส่งฟิลด์ใดมาเลย, THE SKU_Management_System SHALL ส่งข้อมูลเดิมกลับโดยไม่เปลี่ยนแปลง

### Requirement 5: ลบ SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการลบ SKU ที่ไม่ใช้งานแล้ว เพื่อรักษาความเป็นระเบียบของระบบ

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอลบ SKU ที่มีอยู่ในระบบ, THE SKU_Management_System SHALL ลบข้อมูลสินค้าออกจากฐานข้อมูลและส่ง HTTP status 200 พร้อมข้อความยืนยัน
2. IF Authenticated_User ส่งคำขอลบ SKU ที่ไม่มีอยู่ในระบบ, THEN THE SKU_Management_System SHALL ส่งข้อความแจ้งข้อผิดพลาด "ไม่พบสินค้า" พร้อม HTTP status 404
3. WHEN Authenticated_User ยืนยันการลบจากหน้า UI, THE SKU_Management_System SHALL แสดงกล่องยืนยัน (confirmation dialog) ก่อนดำเนินการลบ

### Requirement 6: ดูรายละเอียด SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการดูรายละเอียดทั้งหมดของสินค้าจากรหัส SKU เพื่อตรวจสอบข้อมูลอย่างครบถ้วน

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอดูรายละเอียดของ SKU ที่มีอยู่ในระบบ, THE SKU_Management_System SHALL ส่งข้อมูลสินค้าทั้งหมดกลับ ประกอบด้วย id, name, sku, category, quantity, unitPrice, description, imageUrl, status, createdAt, updatedAt
2. IF Authenticated_User ส่งคำขอดูรายละเอียดของ SKU ที่ไม่มีอยู่ในระบบ, THEN THE SKU_Management_System SHALL ส่งข้อความแจ้งข้อผิดพลาด "ไม่พบสินค้า" พร้อม HTTP status 404

### Requirement 7: การจัดการสถานะ SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการเปลี่ยนสถานะ SKU เป็น active หรือ inactive เพื่อจัดการสินค้าที่หยุดใช้งานชั่วคราวโดยไม่ต้องลบ

#### Acceptance Criteria

1. WHEN Authenticated_User ส่งคำขอเปลี่ยนสถานะ SKU เป็น "inactive", THE SKU_Management_System SHALL อัปเดตสถานะและส่งข้อมูลที่อัปเดตแล้วกลับพร้อม HTTP status 200
2. WHEN Authenticated_User ส่งคำขอเปลี่ยนสถานะ SKU เป็น "active", THE SKU_Management_System SHALL อัปเดตสถานะและส่งข้อมูลที่อัปเดตแล้วกลับพร้อม HTTP status 200
3. IF Authenticated_User ส่งค่าสถานะที่ไม่ใช่ "active" หรือ "inactive", THEN THE Validator SHALL ปฏิเสธคำขอและส่งข้อความแจ้งข้อผิดพลาดพร้อม HTTP status 400

### Requirement 8: หน้า UI สำหรับจัดการ SKU

**User Story:** ในฐานะผู้ดูแลคลังสินค้า ฉันต้องการหน้าเว็บสำหรับจัดการ SKU ที่ใช้งานง่าย เพื่อดำเนินการ CRUD ได้โดยไม่ต้องเรียก API โดยตรง

#### Acceptance Criteria

1. THE SKU_Management_System SHALL แสดงหน้ารายการ SKU ที่มีตารางแสดงข้อมูล รองรับการค้นหา และมีปุ่มเพิ่ม SKU ใหม่
2. WHEN Authenticated_User กดปุ่มเพิ่ม SKU ใหม่, THE SKU_Management_System SHALL แสดง modal form สำหรับกรอกข้อมูลสินค้าและ SKU โดยมีตัวเลือกให้กรอก SKU เองหรือสร้างอัตโนมัติจากหมวดหมู่
3. WHEN Authenticated_User กดปุ่มแก้ไขในตาราง, THE SKU_Management_System SHALL แสดง modal form ที่มีข้อมูลเดิมเติมไว้ให้แก้ไข
4. WHEN Authenticated_User กดปุ่มลบในตาราง, THE SKU_Management_System SHALL แสดง confirmation dialog ก่อนดำเนินการลบ
5. WHEN การสร้างหรือแก้ไข SKU สำเร็จ, THE SKU_Management_System SHALL ปิด modal และรีเฟรชรายการ SKU ในตาราง
6. IF การเรียก API ล้มเหลว, THEN THE SKU_Management_System SHALL แสดงข้อความแจ้งข้อผิดพลาดให้ผู้ใช้ทราบ

### Requirement 9: การตรวจสอบสิทธิ์การเข้าถึง

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการให้เฉพาะผู้ใช้ที่ล็อกอินแล้วเท่านั้นที่เข้าถึง API จัดการ SKU ได้ เพื่อรักษาความปลอดภัยของข้อมูล

#### Acceptance Criteria

1. WHILE ผู้ใช้ไม่มี token ที่ถูกต้อง, THE SKU_Management_System SHALL ปฏิเสธคำขอทุกรายการและส่ง HTTP status 401
2. WHILE ผู้ใช้มี token ที่หมดอายุ, THE SKU_Management_System SHALL ปฏิเสธคำขอทุกรายการและส่ง HTTP status 401
3. WHEN ผู้ใช้ส่ง token ที่ถูกต้องและยังไม่หมดอายุ, THE SKU_Management_System SHALL อนุญาตให้เข้าถึง API จัดการ SKU
