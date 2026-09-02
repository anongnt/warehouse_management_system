# Requirements Document

## Introduction

ฟีเจอร์นี้เปลี่ยน Layout ของระบบจัดการคลังสินค้า (WMS) จาก Top Navbar (แถบเมนูด้านบน) เป็น Sidebar Menu (แถบเมนูด้านซ้าย) ที่สามารถเปิด-ปิด (collapse/expand) ได้ โดยมีแอนิเมชันที่ลื่นไหลและจดจำสถานะของ Sidebar ข้ามเซสชัน

## Glossary

- **Sidebar**: คอมโพเนนต์แถบเมนูแนวตั้งทางด้านซ้ายของหน้าจอ ใช้สำหรับนำทางไปยังหน้าต่าง ๆ ในระบบ
- **Expanded_State**: สถานะของ Sidebar เมื่อแสดงผลแบบเต็มความกว้าง โดยแสดงทั้งไอคอนและข้อความของรายการเมนู
- **Collapsed_State**: สถานะของ Sidebar เมื่อแสดงผลแบบแคบ โดยแสดงเฉพาะไอคอนของรายการเมนูเท่านั้น
- **Toggle_Button**: ปุ่มสำหรับสลับสถานะระหว่าง Expanded_State และ Collapsed_State อยู่ที่ด้านล่างของ Sidebar
- **Main_Content_Area**: พื้นที่แสดงเนื้อหาหลักของหน้า อยู่ทางด้านขวาของ Sidebar
- **Active_Menu_Item**: รายการเมนูที่ตรงกับเส้นทาง (route) ปัจจุบันของหน้าเว็บ
- **Admin_Menu_Section**: กลุ่มรายการเมนูที่แสดงเฉพาะผู้ใช้ที่มี role เป็น admin เท่านั้น
- **User_Profile_Section**: ส่วนที่แสดงข้อมูลผู้ใช้และปุ่มออกจากระบบ

## Requirements

### Requirement 1: โครงสร้าง Sidebar Layout

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการแถบเมนูด้านซ้ายแนวตั้ง เพื่อให้สามารถนำทางไปยังส่วนต่าง ๆ ของระบบได้สะดวก

#### Acceptance Criteria

1. THE Sidebar SHALL แสดงผลแนวตั้งอยู่ทางด้านซ้ายของหน้าจอตลอดเวลาที่ผู้ใช้เข้าสู่ระบบแล้ว
2. THE Sidebar SHALL แสดงโลโก้ของระบบ (WMS) อยู่ที่ส่วนบนสุดของ Sidebar โดยใช้ gradient icon และข้อความ "WMS" เหมือนในระบบปัจจุบัน
3. THE Sidebar SHALL แสดงรายการเมนูนำทางทั้งหมดที่ปัจจุบันมีอยู่ใน Top Navbar ได้แก่ แดชบอร์ด (/dashboard), จัดการสินค้า (/products), หมวดหมู่ (/categories), สต็อก (/stock/balances), ประวัติสต็อก (/stock/movements) และรายงาน (/reports)
4. THE Sidebar SHALL มีความสูงเต็มหน้าจอ (100vh) และมีตำแหน่งคงที่ (fixed position) ไม่เลื่อนตามเนื้อหา
5. THE Main_Content_Area SHALL อยู่ทางด้านขวาของ Sidebar โดยมี margin-left เท่ากับความกว้างของ Sidebar ปัจจุบัน และใช้พื้นที่ที่เหลือทั้งหมด
6. THE Top Navbar ที่มีอยู่ในปัจจุบัน SHALL ถูกแทนที่ด้วย Sidebar โดยสมบูรณ์ ไม่ให้แสดงควบคู่กัน

### Requirement 2: สถานะ Expanded ของ Sidebar

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการเห็นทั้งไอคอนและข้อความของเมนู เพื่อให้เข้าใจรายการเมนูได้ชัดเจน

#### Acceptance Criteria

1. WHILE Sidebar อยู่ใน Expanded_State, THE Sidebar SHALL แสดงไอคอนและข้อความของรายการเมนูแต่ละรายการในแนวนอน (ไอคอนอยู่ด้านซ้าย ข้อความอยู่ด้านขวาของไอคอน) โดยข้อความที่ยาวเกิน 20 ตัวอักษรจะถูกตัดด้วยเครื่องหมาย ellipsis (...)
2. WHILE Sidebar อยู่ใน Expanded_State, THE Sidebar SHALL มีความกว้างเท่ากับ 256 พิกเซล
3. WHILE Sidebar อยู่ใน Expanded_State, THE Toggle_Button SHALL แสดงไอคอนลูกศรชี้ไปทางซ้าย (เพื่อสื่อว่าสามารถย่อ Sidebar ได้)
4. WHILE Sidebar อยู่ใน Expanded_State, THE User_Profile_Section SHALL แสดงชื่อผู้ใช้ (ตัดที่ 18 ตัวอักษรพร้อม ellipsis หากเกิน) และ role ของผู้ใช้เป็นข้อความด้านล่างชื่อ
5. WHEN ระบบโหลดครั้งแรก, THE Sidebar SHALL แสดงผลใน Expanded_State เป็นค่าเริ่มต้น

### Requirement 3: สถานะ Collapsed ของ Sidebar

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการย่อ Sidebar เพื่อให้มีพื้นที่แสดงเนื้อหาหลักมากขึ้น

#### Acceptance Criteria

1. WHILE Sidebar อยู่ใน Collapsed_State, THE Sidebar SHALL แสดงเฉพาะไอคอนของรายการเมนูโดยไม่แสดงข้อความ และไอคอนแต่ละรายการ SHALL อยู่กึ่งกลางแนวนอนของ Sidebar
2. WHILE Sidebar อยู่ใน Collapsed_State, THE Sidebar SHALL มีความกว้างเท่ากับ 64 พิกเซล
3. WHILE Sidebar อยู่ใน Collapsed_State, THE Toggle_Button SHALL แสดงไอคอนลูกศรชี้ไปทางขวา (เพื่อสื่อว่าสามารถขยาย Sidebar ได้)
4. WHILE Sidebar อยู่ใน Collapsed_State, THE Main_Content_Area SHALL มี margin-left เท่ากับ 64 พิกเซล และขยายเต็มพื้นที่ที่เหลือ
5. WHILE Sidebar อยู่ใน Collapsed_State, THE User_Profile_Section SHALL แสดงเฉพาะตัวอักษรย่อของผู้ใช้ (avatar แสดงตัวอักษรแรกของ firstName) โดยอยู่กึ่งกลาง
6. WHILE Sidebar อยู่ใน Collapsed_State, THE โลโก้ SHALL แสดงเฉพาะไอคอน gradient โดยไม่แสดงข้อความ "WMS"

### Requirement 4: การสลับสถานะ Sidebar

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการปุ่มสำหรับเปิด-ปิด Sidebar เพื่อให้สามารถควบคุมขนาดเมนูได้ตามต้องการ

#### Acceptance Criteria

1. WHILE Sidebar อยู่ใน Expanded_State (ความกว้าง 256px), WHEN ผู้ใช้กดปุ่ม Toggle_Button, THE Sidebar SHALL เปลี่ยนเป็น Collapsed_State (ความกว้าง 64px)
2. WHILE Sidebar อยู่ใน Collapsed_State (ความกว้าง 64px), WHEN ผู้ใช้กดปุ่ม Toggle_Button, THE Sidebar SHALL เปลี่ยนเป็น Expanded_State (ความกว้าง 256px)
3. THE Toggle_Button SHALL อยู่ที่ตำแหน่งด้านล่างสุดของ Sidebar และแสดงไอคอน chevron ชี้ไปทางซ้ายเมื่ออยู่ใน Expanded_State หรือชี้ไปทางขวาเมื่ออยู่ใน Collapsed_State
4. WHEN Sidebar เปลี่ยนสถานะ, THE Sidebar SHALL แสดงแอนิเมชัน transition โดยมีระยะเวลาไม่เกิน 300 มิลลิวินาที
5. WHEN Sidebar เปลี่ยนสถานะ, THE Main_Content_Area SHALL ปรับขนาดตามโดยใช้แอนิเมชัน transition ที่มีระยะเวลาเท่ากับ Sidebar (ไม่เกิน 300 มิลลิวินาที) และเริ่มต้นพร้อมกัน
6. IF ผู้ใช้กดปุ่ม Toggle_Button ขณะที่แอนิเมชัน transition กำลังทำงานอยู่, THEN THE Sidebar SHALL รอให้แอนิเมชันปัจจุบันเสร็จสิ้นก่อนจึงดำเนินการสลับสถานะครั้งถัดไป

### Requirement 5: การจดจำสถานะ Sidebar

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการให้ระบบจดจำสถานะ Sidebar ที่ฉันเลือกไว้ เพื่อไม่ต้องตั้งค่าใหม่ทุกครั้งที่เปิดหน้าเว็บ

#### Acceptance Criteria

1. WHEN ผู้ใช้เปลี่ยนสถานะ Sidebar, THE Sidebar SHALL บันทึกสถานะปัจจุบัน ('expanded' หรือ 'collapsed') ลงใน localStorage ภายใต้ key ชื่อ 'sidebar-state'
2. WHEN ผู้ใช้เปิดหน้าเว็บใหม่หรือ refresh หน้า, THE Sidebar SHALL อ่านค่าจาก localStorage key 'sidebar-state' และแสดงผลตามสถานะนั้นทันทีโดยไม่กระพริบ (no flash of wrong state)
3. IF ไม่มีข้อมูลสถานะใน localStorage (key 'sidebar-state' ไม่มีอยู่หรือมีค่าที่ไม่ถูกต้อง), THEN THE Sidebar SHALL แสดงผลใน Expanded_State เป็นค่าเริ่มต้น
4. WHEN ผู้ใช้ logout, THE Sidebar state ใน localStorage SHALL ไม่ถูกลบ เพื่อให้สถานะคงอยู่เมื่อ login ใหม่ในเบราว์เซอร์เดียวกัน

### Requirement 6: การแสดง Active Menu Item

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการรู้ว่าฉันอยู่หน้าไหน เพื่อให้ทราบตำแหน่งปัจจุบันในระบบ

#### Acceptance Criteria

1. THE Sidebar SHALL เน้นสี (highlight) Active_Menu_Item โดยแสดงสีพื้นหลังเน้น (เช่น blue-50) ที่แตกต่างจากสีพื้นหลังปกติของรายการอื่นอย่างชัดเจน โดย Active_Menu_Item คือรายการที่มี path ตรงกับ current route path (ใช้ prefix matching สำหรับ nested routes)
2. WHILE Sidebar อยู่ใน Expanded_State, THE Active_Menu_Item SHALL แสดงสีพื้นหลังเน้น (เช่น blue-50) และสีตัวอักษรเข้ม (เช่น blue-700) ที่แตกต่างจากสีตัวอักษรปกติของรายการที่ไม่ active
3. WHILE Sidebar อยู่ใน Collapsed_State, THE Active_Menu_Item SHALL แสดงสีพื้นหลังเน้นที่ไอคอน โดยใช้สีพื้นหลังเน้นเดียวกับ Expanded_State
4. WHEN ผู้ใช้นำทางไปยังหน้าใหม่ (route เปลี่ยน), THE Sidebar SHALL อัปเดต Active_Menu_Item ให้ตรงกับ route ปัจจุบันทันทีโดยไม่ต้อง reload หน้า
5. IF ไม่มี Menu_Item ใดที่มี path ตรงกับ current route path, THEN THE Sidebar SHALL ไม่เน้นสี (highlight) รายการใดเลย

### Requirement 7: การแสดงเมนูตาม Role

**User Story:** ในฐานะผู้ดูแลระบบ ฉันต้องการเห็นเมนูสำหรับ admin เพิ่มเติม เพื่อให้สามารถเข้าถึงฟังก์ชันจัดการระบบได้

#### Acceptance Criteria

1. WHILE ผู้ใช้มี role เป็น admin, THE Sidebar SHALL แสดง Admin_Menu_Section ที่ประกอบด้วยรายการ "จัดการผู้ใช้" (นำทางไปยัง /users) และ "ปรับยอดสต็อก" (นำทางไปยัง /stock/adjustments/new)
2. WHILE ผู้ใช้มี role ไม่ใช่ admin, THE Sidebar SHALL ไม่ render Admin_Menu_Section ใน DOM (ไม่ใช่แค่ซ่อนด้วย CSS) เพื่อป้องกันการเข้าถึงลิงก์ของ admin
3. THE Admin_Menu_Section SHALL แสดงหัวข้อกลุ่มที่มีข้อความระบุว่าเป็นส่วนของผู้ดูแลระบบ และคั่นจากกลุ่มเมนูหลักด้วยเส้นแบ่ง (divider) ที่มองเห็นได้
4. IF role ของผู้ใช้ยังไม่ถูกโหลดหรือมีค่าเป็น undefined, THEN THE Sidebar SHALL ไม่แสดง Admin_Menu_Section จนกว่าจะได้รับค่า role ที่ชัดเจน

### Requirement 8: User Profile Section และ Logout

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการเห็นข้อมูลผู้ใช้และสามารถออกจากระบบได้จาก Sidebar เพื่อความสะดวก

#### Acceptance Criteria

1. THE User_Profile_Section SHALL อยู่ที่ส่วนล่างของ Sidebar เหนือ Toggle_Button
2. WHILE Sidebar อยู่ใน Expanded_State, THE User_Profile_Section SHALL แสดง avatar (ตัวอักษรแรกของ firstName ของผู้ใช้), ชื่อผู้ใช้ (firstName), role และปุ่มออกจากระบบ โดยหากชื่อผู้ใช้หรือ role มีความยาวเกินพื้นที่ที่กำหนด ให้ตัดข้อความด้วย ellipsis (...)
3. WHILE Sidebar อยู่ใน Collapsed_State, THE User_Profile_Section SHALL แสดงเฉพาะ avatar (ตัวอักษรแรกของ firstName) และปุ่มออกจากระบบแบบไอคอน โดยเมื่อ hover ที่ avatar ให้แสดง tooltip ที่มีชื่อผู้ใช้และ role
4. WHEN ผู้ใช้กดปุ่มออกจากระบบ, THE Sidebar SHALL เรียกฟังก์ชัน logout ที่มีอยู่ในปัจจุบันทันทีโดยไม่แสดง confirmation dialog และไม่เปลี่ยนแปลงพฤติกรรมเดิม
5. WHILE ระบบกำลังดำเนินการ logout, THE ปุ่มออกจากระบบ SHALL อยู่ในสถานะ disabled เพื่อป้องกันการกดซ้ำ จนกว่ากระบวนการ logout จะเสร็จสิ้นหรือล้มเหลว

### Requirement 9: Responsive และ Accessibility

**User Story:** ในฐานะผู้ใช้ระบบ ฉันต้องการให้ Sidebar ใช้งานได้ดีบนหน้าจอขนาดต่าง ๆ และเข้าถึงได้ด้วยคีย์บอร์ด

#### Acceptance Criteria

1. THE Sidebar SHALL มีโครงสร้าง HTML ที่ใช้ semantic element (nav) สำหรับส่วนนำทาง พร้อม aria-label ที่ระบุวัตถุประสงค์ของ navigation
2. THE Sidebar SHALL รองรับการนำทางด้วยคีย์บอร์ด (Tab, Enter) สำหรับรายการเมนูทั้งหมด โดยรายการเมนูที่ได้รับ focus SHALL แสดง focus indicator ที่มองเห็นได้ชัดเจน (มี contrast ratio อย่างน้อย 3:1 กับพื้นหลัง)
3. WHILE Sidebar อยู่ใน Expanded_State, THE Toggle_Button SHALL มี aria-label เป็น "ย่อเมนู" และ WHILE Sidebar อยู่ใน Collapsed_State, THE Toggle_Button SHALL มี aria-label เป็น "ขยายเมนู"
4. WHILE Sidebar อยู่ใน Collapsed_State, WHEN ผู้ใช้ hover หรือ focus บนไอคอนเมนู, THE Sidebar SHALL แสดง tooltip ที่มีชื่อรายการเมนูนั้นภายใน 300 มิลลิวินาที และซ่อน tooltip เมื่อ pointer หรือ focus ออกจากไอคอน
5. WHEN ขนาดหน้าจอมีความกว้างน้อยกว่า 768px, THE Sidebar SHALL ซ่อนตัวเองโดยอัตโนมัติ (off-screen) และแสดงปุ่มเปิดเมนูที่ผู้ใช้สามารถกดเพื่อแสดง Sidebar แบบ overlay ทับเนื้อหาหลักได้
