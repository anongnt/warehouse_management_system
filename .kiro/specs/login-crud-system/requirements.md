# Requirements Document

## Introduction

ระบบ Login พร้อมการจัดการผู้ใช้แบบ CRUD (Create, Read, Update, Delete) สำหรับแอปพลิเคชันเว็บ โดยใช้ React TypeScript เป็น Frontend, Node.js เป็น Backend, SQL Server เป็นฐานข้อมูล และ Tailwind CSS สำหรับ UI ระบบนี้ครอบคลุมการลงทะเบียนผู้ใช้ใหม่ การเข้าสู่ระบบ/ออกจากระบบ และการจัดการข้อมูลผู้ใช้

## Glossary

- **System**: ระบบ Login CRUD โดยรวม ประกอบด้วย Frontend และ Backend
- **Auth_Service**: บริการจัดการการยืนยันตัวตน (Authentication) บน Backend
- **User_Service**: บริการจัดการข้อมูลผู้ใช้ (CRUD operations) บน Backend
- **Frontend**: แอปพลิเคชัน React TypeScript ที่แสดงผลหน้าจอและรับข้อมูลจากผู้ใช้
- **Database**: ฐานข้อมูล SQL Server ที่เก็บข้อมูลผู้ใช้
- **User**: ผู้ใช้งานระบบที่ลงทะเบียนแล้ว
- **Session_Token**: โทเค็นที่ใช้ยืนยันสถานะการเข้าสู่ระบบของผู้ใช้
- **Admin**: ผู้ดูแลระบบที่มีสิทธิ์จัดการข้อมูลผู้ใช้ทั้งหมด

## Requirements

### Requirement 1: การลงทะเบียนผู้ใช้ใหม่ (User Registration)

**User Story:** As a ผู้ใช้ใหม่, I want to ลงทะเบียนบัญชีผู้ใช้, so that ฉันสามารถเข้าใช้งานระบบได้

#### Acceptance Criteria

1. WHEN ผู้ใช้ใหม่กรอกข้อมูล email (ไม่เกิน 254 ตัวอักษร), password (8-128 ตัวอักษร), และ ชื่อ-นามสกุล (1-100 ตัวอักษรต่อฟิลด์) ครบทุกฟิลด์และผ่านการตรวจสอบรูปแบบ, THE Auth_Service SHALL สร้างบัญชีผู้ใช้ใหม่ในฐานข้อมูลและส่งผลลัพธ์สำเร็จกลับไปยัง Frontend ภายใน 3 วินาที
2. WHEN ผู้ใช้ใหม่กรอก email ที่มีอยู่ในระบบแล้ว, THE Auth_Service SHALL ส่งข้อความแจ้งเตือนว่า email นี้ถูกใช้งานแล้ว โดยไม่สร้างบัญชีซ้ำ
3. IF ผู้ใช้ใหม่กรอก password ที่มีความยาวน้อยกว่า 8 ตัวอักษร หรือมากกว่า 128 ตัวอักษร, THEN THE Auth_Service SHALL ส่งข้อความแจ้งเตือนว่า password ต้องมีความยาว 8-128 ตัวอักษร และไม่บันทึกข้อมูลลงฐานข้อมูล
4. THE Auth_Service SHALL เข้ารหัส password ด้วยวิธี hashing ก่อนบันทึกลงใน Database โดย password ที่เก็บต้องไม่สามารถอ่านเป็นข้อความต้นฉบับได้
5. WHEN ผู้ใช้ใหม่กรอก email ในรูปแบบที่ไม่มีเครื่องหมาย @ หรือไม่มี domain name, THE Frontend SHALL แสดงข้อความแจ้งเตือนว่ารูปแบบ email ไม่ถูกต้อง ก่อนส่งข้อมูลไปยัง Auth_Service
6. IF ผู้ใช้ใหม่กรอกชื่อหรือนามสกุลที่เป็นค่าว่าง หรือมีความยาวเกิน 100 ตัวอักษร, THEN THE Auth_Service SHALL ส่งข้อความแจ้งเตือนว่าชื่อและนามสกุลต้องมีความยาว 1-100 ตัวอักษร และไม่บันทึกข้อมูลลงฐานข้อมูล
7. IF Auth_Service ไม่สามารถเชื่อมต่อฐานข้อมูลได้ระหว่างการลงทะเบียน, THEN THE Auth_Service SHALL ส่งข้อความแจ้งเตือนข้อผิดพลาดที่ระบุว่าระบบไม่สามารถดำเนินการได้ชั่วคราว โดยไม่บันทึกข้อมูลบางส่วนลงฐานข้อมูล

### Requirement 2: การเข้าสู่ระบบ (Login)

**User Story:** As a ผู้ใช้ที่ลงทะเบียนแล้ว, I want to เข้าสู่ระบบด้วย email และ password, so that ฉันสามารถเข้าถึงฟีเจอร์ต่างๆ ของระบบได้

#### Acceptance Criteria

1. WHEN ผู้ใช้กรอก email และ password ที่ตรงกับข้อมูลในระบบและบัญชีไม่ถูกล็อก, THE Auth_Service SHALL สร้าง Session_Token ที่มีอายุ 24 ชั่วโมง และส่งกลับไปยัง Frontend ภายใน 3 วินาที
2. IF ผู้ใช้กรอก email หรือ password ไม่ตรงกับข้อมูลในระบบ, THEN THE Auth_Service SHALL ส่งข้อความแจ้งเตือนทั่วไปว่า "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง" โดยไม่ระบุว่า email หรือ password ตัวใดผิด
3. WHEN ผู้ใช้เข้าสู่ระบบสำเร็จ, THE Frontend SHALL นำทางผู้ใช้ไปยังหน้าหลักของระบบ และ reset จำนวนครั้งที่กรอก password ผิดของบัญชีนั้นเป็น 0
4. IF ผู้ใช้กรอก password ผิดติดต่อกัน 5 ครั้ง, THEN THE Auth_Service SHALL ล็อกบัญชีผู้ใช้เป็นเวลา 15 นาที และแสดงข้อความแจ้งเตือนว่าบัญชีถูกล็อกพร้อมระบุเวลาที่เหลือก่อนปลดล็อก
5. IF ผู้ใช้พยายามเข้าสู่ระบบด้วยบัญชีที่ถูกล็อก, THEN THE Auth_Service SHALL ปฏิเสธการเข้าสู่ระบบ และแสดงข้อความแจ้งเตือนว่าบัญชีถูกล็อกพร้อมระบุเวลาที่เหลือก่อนปลดล็อก

### Requirement 3: การออกจากระบบ (Logout)

**User Story:** As a ผู้ใช้ที่เข้าสู่ระบบแล้ว, I want to ออกจากระบบ, so that ฉันสามารถป้องกันการเข้าถึงบัญชีโดยผู้อื่น

#### Acceptance Criteria

1. WHEN ผู้ใช้กดปุ่มออกจากระบบ, THE Auth_Service SHALL ลบ Session_Token ของผู้ใช้ออกจากระบบภายใน 2 วินาที และทำให้ Token ดังกล่าวไม่สามารถใช้ยืนยันตัวตนได้อีก
2. WHEN ผู้ใช้ออกจากระบบสำเร็จ, THE Frontend SHALL ลบ Session_Token ที่เก็บไว้ฝั่ง Client และนำทางผู้ใช้ไปยังหน้า Login ภายใน 1 วินาที
3. IF การออกจากระบบล้มเหลวเนื่องจากข้อผิดพลาดของระบบหรือเครือข่าย, THEN THE Frontend SHALL ลบ Session_Token ฝั่ง Client, แสดงข้อความแจ้งเตือนว่าการออกจากระบบอาจไม่สมบูรณ์, และนำทางผู้ใช้ไปยังหน้า Login
4. WHILE ผู้ใช้ไม่มี Session_Token ที่ถูกต้อง, THE Frontend SHALL เปลี่ยนเส้นทาง (redirect) ผู้ใช้ไปยังหน้า Login เมื่อพยายามเข้าถึงหน้าอื่นใด

### Requirement 4: ดูรายชื่อผู้ใช้ (Read Users)

**User Story:** As a Admin, I want to ดูรายชื่อผู้ใช้ทั้งหมดในระบบ, so that ฉันสามารถบริหารจัดการผู้ใช้ได้

#### Acceptance Criteria

1. WHEN Admin เข้าถึงหน้าจัดการผู้ใช้, THE User_Service SHALL ดึงข้อมูลรายชื่อผู้ใช้จาก Database แบบแบ่งหน้า (pagination) โดยแสดงไม่เกิน 20 รายการต่อหน้า และส่งกลับไปยัง Frontend พร้อมจำนวนผู้ใช้ทั้งหมดและหมายเลขหน้าปัจจุบัน
2. THE Frontend SHALL แสดงรายชื่อผู้ใช้ในรูปแบบตาราง โดยแสดง email, ชื่อ-นามสกุล, และสถานะบัญชี พร้อมตัวควบคุมการเปลี่ยนหน้า (pagination controls)
3. WHEN Admin ค้นหาผู้ใช้ด้วย email หรือ ชื่อ, THE User_Service SHALL กรองรายชื่อผู้ใช้แบบ partial match (ค้นหาบางส่วนของข้อความได้) โดยไม่คำนึงถึงตัวพิมพ์เล็ก-ใหญ่ และส่งผลลัพธ์กลับแบบแบ่งหน้า
4. THE User_Service SHALL ไม่ส่งข้อมูล password ในการตอบกลับรายชื่อผู้ใช้
5. IF การค้นหาหรือดึงข้อมูลไม่พบผู้ใช้, THEN THE Frontend SHALL แสดงข้อความแจ้งว่าไม่พบข้อมูลผู้ใช้
6. IF Database ไม่สามารถเชื่อมต่อได้หรือเกิดข้อผิดพลาดในการดึงข้อมูล, THEN THE User_Service SHALL ส่งข้อความ error กลับไปยัง Frontend และ Frontend SHALL แสดงข้อความแจ้งเตือนข้อผิดพลาดแก่ Admin

### Requirement 5: แก้ไขข้อมูลผู้ใช้ (Update User)

**User Story:** As a Admin, I want to แก้ไขข้อมูลผู้ใช้, so that ฉันสามารถอัปเดตข้อมูลที่ไม่ถูกต้องหรือเปลี่ยนสถานะผู้ใช้ได้

#### Acceptance Criteria

1. WHEN Admin แก้ไขข้อมูลผู้ใช้ (ชื่อ, นามสกุล, email, role, หรือสถานะบัญชี) และกดบันทึก, THE User_Service SHALL ตรวจสอบความถูกต้องของข้อมูล อัปเดตข้อมูลผู้ใช้ใน Database และส่ง response สำเร็จพร้อมข้อมูลผู้ใช้ที่อัปเดตแล้วกลับภายใน 3 วินาที
2. IF Admin แก้ไข email เป็น email ที่มีอยู่ในระบบแล้ว (ของผู้ใช้คนอื่น), THEN THE User_Service SHALL ปฏิเสธการบันทึกและส่งข้อความแจ้งเตือนว่า email นี้ถูกใช้งานแล้ว โดยไม่เปลี่ยนแปลงข้อมูลใน Database
3. THE User_Service SHALL บันทึกวันเวลาที่แก้ไขข้อมูลล่าสุด (updated_at) ลงใน Database ทุกครั้งที่มีการอัปเดตข้อมูลสำเร็จ
4. WHEN Admin เปลี่ยนสถานะบัญชีผู้ใช้เป็น "ระงับ", THE User_Service SHALL ยกเลิก Session_Token ของผู้ใช้คนนั้นทันที ทำให้ผู้ใช้ถูก logout จากทุก session ที่ active อยู่
5. IF Admin ส่งคำขอแก้ไขข้อมูลผู้ใช้ที่ไม่มีอยู่ในระบบ, THEN THE User_Service SHALL ส่งข้อความแจ้งเตือนว่าไม่พบผู้ใช้ดังกล่าว
6. IF Admin ส่งข้อมูลที่จำเป็น (ชื่อ, นามสกุล, email) เป็นค่าว่างหรือ email ไม่ตรงตามรูปแบบที่ถูกต้อง, THEN THE User_Service SHALL ปฏิเสธการบันทึกและแสดงข้อความระบุฟิลด์ที่ไม่ผ่านการตรวจสอบ โดยไม่เปลี่ยนแปลงข้อมูลใน Database

### Requirement 6: ลบผู้ใช้ (Delete User)

**User Story:** As a Admin, I want to ลบบัญชีผู้ใช้, so that ฉันสามารถลบบัญชีที่ไม่ต้องการออกจากระบบได้

#### Acceptance Criteria

1. WHEN Admin กดปุ่มลบผู้ใช้, THE Frontend SHALL แสดงกล่องยืนยันการลบที่ระบุชื่อผู้ใช้ที่จะถูกลบ พร้อมปุ่มยืนยันและปุ่มยกเลิก โดยไม่ดำเนินการลบจนกว่า Admin จะกดปุ่มยืนยัน
2. WHEN Admin ยืนยันการลบผู้ใช้, THE User_Service SHALL ลบข้อมูลผู้ใช้ออกจาก Database ภายใน 5 วินาที และส่งผลลัพธ์สำเร็จกลับไปยัง Frontend เพื่อแสดงข้อความแจ้งว่าลบสำเร็จ และอัปเดตรายการผู้ใช้โดยไม่แสดงผู้ใช้ที่ถูกลบแล้ว
3. WHEN Admin ยืนยันการลบผู้ใช้ที่กำลังเข้าสู่ระบบอยู่, THE User_Service SHALL ยกเลิก Session_Token ทั้งหมดของผู้ใช้คนนั้นก่อนทำการลบข้อมูล เพื่อให้ผู้ใช้คนนั้นถูกบังคับออกจากระบบทันที
4. IF การลบผู้ใช้ล้มเหลว, THEN THE User_Service SHALL ส่งข้อความแจ้งเตือนข้อผิดพลาดที่ระบุสาเหตุของความล้มเหลวกลับไปยัง Frontend และข้อมูลผู้ใช้ต้องไม่ถูกเปลี่ยนแปลง
5. IF Admin พยายามลบบัญชีของตนเอง, THEN THE Frontend SHALL ไม่อนุญาตให้ดำเนินการ และแสดงข้อความแจ้งว่าไม่สามารถลบบัญชีของตนเองได้

### Requirement 7: การป้องกันเส้นทาง (Route Protection)

**User Story:** As a ผู้ดูแลระบบ, I want to ป้องกันไม่ให้ผู้ใช้ที่ไม่ได้รับอนุญาตเข้าถึง API, so that ข้อมูลในระบบปลอดภัย

#### Acceptance Criteria

1. WHILE ผู้ใช้ไม่มี Session_Token หรือ Session_Token ไม่ผ่านการตรวจสอบ (ไม่มีอยู่ในระบบ, รูปแบบไม่ถูกต้อง, หรือหมดอายุ), THE Auth_Service SHALL ปฏิเสธคำขอเข้าถึง API ที่ต้องการการยืนยันตัวตนทุกเส้นทาง โดยส่งรหัสสถานะ 401 พร้อมข้อความแสดงข้อผิดพลาดที่ระบุสาเหตุการปฏิเสธ ภายในเวลาไม่เกิน 2 วินาที
2. WHILE ผู้ใช้มีบทบาทเป็น User ปกติ, THE Auth_Service SHALL ปฏิเสธคำขอเข้าถึง API จัดการผู้ใช้ (Create, Read, Update, Delete) โดยส่งรหัสสถานะ 403 พร้อมข้อความแสดงข้อผิดพลาดที่ระบุว่าสิทธิ์ไม่เพียงพอ
3. WHEN Session_Token หมดอายุขณะที่ผู้ใช้กำลังใช้งานระบบ, THE Auth_Service SHALL ส่งรหัสสถานะ 401 พร้อมข้อความระบุว่า Session หมดอายุ
4. WHEN Frontend ได้รับรหัสสถานะ 401 จาก API ใดก็ตาม, THE Frontend SHALL นำทางผู้ใช้ไปยังหน้า Login ภายในเวลาไม่เกิน 3 วินาที โดยไม่เก็บข้อมูล Session_Token เดิมไว้ในระบบ
5. IF คำขอ API ไม่มี Session_Token ใน Header, THEN THE Auth_Service SHALL ปฏิเสธคำขอโดยส่งรหัสสถานะ 401 พร้อมข้อความระบุว่าไม่พบ Token ในคำขอ โดยไม่ดำเนินการประมวลผลคำขอต่อ

### Requirement 8: การเปลี่ยน Password ของตนเอง

**User Story:** As a ผู้ใช้ที่เข้าสู่ระบบแล้ว, I want to เปลี่ยน password ของตนเอง, so that ฉันสามารถรักษาความปลอดภัยของบัญชีได้

#### Acceptance Criteria

1. WHEN ผู้ใช้กรอก password เดิมถูกต้อง และ password ใหม่ที่มีความยาว 8-128 ตัวอักษร และ password ยืนยันตรงกับ password ใหม่ และ password ใหม่ไม่ซ้ำกับ password เดิม, THE Auth_Service SHALL อัปเดต password ใหม่ที่ผ่านการ hash แล้วลงใน Database และแสดงข้อความแจ้งว่าเปลี่ยน password สำเร็จ
2. IF ผู้ใช้กรอก password เดิมไม่ถูกต้อง, THEN THE Auth_Service SHALL ปฏิเสธการเปลี่ยน password และแสดงข้อความแจ้งเตือนว่า password เดิมไม่ถูกต้อง โดยไม่เปลี่ยนแปลงข้อมูลใน Database
3. WHEN ผู้ใช้เปลี่ยน password สำเร็จ, THE Auth_Service SHALL ยกเลิก Session_Token ทั้งหมดของผู้ใช้ยกเว้น Session ปัจจุบัน
4. IF password ยืนยันไม่ตรงกับ password ใหม่, THEN THE Auth_Service SHALL ปฏิเสธการเปลี่ยน password และแสดงข้อความแจ้งเตือนว่า password ยืนยันไม่ตรงกัน
5. IF password ใหม่ซ้ำกับ password เดิม, THEN THE Auth_Service SHALL ปฏิเสธการเปลี่ยน password และแสดงข้อความแจ้งเตือนว่า password ใหม่ต้องไม่ซ้ำกับ password เดิม
