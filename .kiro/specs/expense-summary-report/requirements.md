# Requirements Document

## Introduction

ฟีเจอร์หน้ารายงานสรุปค่าใช้จ่าย (Expense Summary Report) สำหรับระบบจัดการคลังสินค้า เพื่อให้ผู้ใช้สามารถดูสรุปค่าใช้จ่ายด้านสินค้าคงคลังในรูปแบบต่างๆ ได้แก่ สรุปค่าใช้จ่ายตามช่วงเวลา สรุปตามหมวดหมู่สินค้า และสามารถส่งออกรายงานเป็นไฟล์ PDF หรือ Excel ได้ หน้ารายงานนี้จะแสดงข้อมูลในรูปแบบตารางและกราฟ เพื่อให้ง่ายต่อการวิเคราะห์ค่าใช้จ่ายของคลังสินค้า

## Glossary

- **Expense_Summary_Page**: หน้าเว็บแสดงรายงานสรุปค่าใช้จ่ายสินค้าคงคลัง
- **Expense_Report_API**: API endpoint ที่ให้บริการข้อมูลสรุปค่าใช้จ่ายสินค้าคงคลัง
- **Date_Range_Filter**: ตัวกรองช่วงวันที่สำหรับกรองข้อมูลค่าใช้จ่าย
- **Category_Filter**: ตัวกรองหมวดหมู่สินค้าสำหรับกรองข้อมูลค่าใช้จ่าย
- **Expense_Summary_Data**: ข้อมูลสรุปค่าใช้จ่ายที่ประกอบด้วย มูลค่ารวม จำนวนสินค้า และรายละเอียดค่าใช้จ่ายแยกตามหมวดหมู่
- **Expense_Chart**: กราฟแสดงข้อมูลค่าใช้จ่ายในรูปแบบ Bar Chart หรือ Pie Chart
- **Report_Exporter**: ส่วนที่ทำหน้าที่ส่งออกรายงานเป็นไฟล์ PDF หรือ Excel
- **Authenticated_User**: ผู้ใช้ที่เข้าสู่ระบบแล้วและมีสิทธิ์เข้าถึงรายงาน

## Requirements

### Requirement 1: แสดงหน้ารายงานสรุปค่าใช้จ่าย

**User Story:** As a ผู้จัดการคลังสินค้า, I want to ดูหน้ารายงานสรุปค่าใช้จ่ายสินค้าคงคลัง, so that ฉันสามารถเห็นภาพรวมของค่าใช้จ่ายทั้งหมดได้อย่างรวดเร็ว

#### Acceptance Criteria

1. WHEN Authenticated_User เข้าถึงหน้ารายงานสรุปค่าใช้จ่าย, THE Expense_Summary_Page SHALL แสดงข้อมูลสรุปรวมประกอบด้วย มูลค่าค่าใช้จ่ายรวมทั้งหมด (แสดงเป็นทศนิยม 2 ตำแหน่ง), จำนวนรายการสินค้าทั้งหมด (จำนวนเต็ม), และจำนวนหมวดหมู่ที่มีค่าใช้จ่าย (จำนวนเต็ม)
2. THE Expense_Summary_Page SHALL แสดงตารางรายละเอียดค่าใช้จ่ายที่ประกอบด้วยคอลัมน์: ชื่อสินค้า, SKU, หมวดหมู่, จำนวน, ราคาต่อหน่วย (ทศนิยม 2 ตำแหน่ง), และมูลค่ารวม (คำนวณจาก จำนวน × ราคาต่อหน่วย แสดงทศนิยม 2 ตำแหน่ง)
3. THE Expense_Summary_Page SHALL เรียงลำดับข้อมูลในตารางตามมูลค่ารวมจากมากไปน้อยเป็นค่าเริ่มต้น
4. WHEN Authenticated_User เข้าถึงหน้ารายงาน, THE Expense_Summary_Page SHALL แสดงข้อมูลของเดือนปัจจุบัน (วันที่ 1 ถึงวันสุดท้ายของเดือนปัจจุบันตามเวลาของระบบ) เป็นค่าเริ่มต้น
5. IF ไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลาที่เลือก, THEN THE Expense_Summary_Page SHALL แสดงสรุปรวมเป็น 0 ทุกรายการ และแสดงข้อความแจ้งว่าไม่พบข้อมูลในตาราง แทนการแสดงตารางว่างเปล่า
6. IF การโหลดข้อมูลรายงานล้มเหลว, THEN THE Expense_Summary_Page SHALL แสดงข้อความแจ้งข้อผิดพลาดให้ผู้ใช้ทราบ และแสดงตัวเลือกให้ลองโหลดข้อมูลใหม่

### Requirement 2: กรองข้อมูลค่าใช้จ่ายตามช่วงเวลา

**User Story:** As a ผู้จัดการคลังสินค้า, I want to กรองข้อมูลค่าใช้จ่ายตามช่วงวันที่ที่ต้องการ, so that ฉันสามารถดูค่าใช้จ่ายในช่วงเวลาที่สนใจได้

#### Acceptance Criteria

1. THE Expense_Summary_Page SHALL แสดง Date_Range_Filter ที่ประกอบด้วยช่องเลือกวันที่เริ่มต้นและวันที่สิ้นสุดในรูปแบบ วัน/เดือน/ปี (DD/MM/YYYY) โดยอนุญาตให้เลือกวันที่ย้อนหลังได้สูงสุด 5 ปีจากวันปัจจุบัน และไม่อนุญาตให้เลือกวันที่ในอนาคต
2. WHEN Authenticated_User เลือกช่วงวันที่ใน Date_Range_Filter และกดปุ่มค้นหา หรือเลือกปุ่มลัดช่วงเวลาสำเร็จรูป, THE Expense_Summary_Page SHALL แสดงเฉพาะข้อมูลค่าใช้จ่ายภายในช่วงวันที่ที่เลือก (รวมวันที่เริ่มต้นและวันที่สิ้นสุด) ภายในเวลาไม่เกิน 3 วินาที
3. IF Authenticated_User เลือกวันที่เริ่มต้นที่อยู่หลังวันที่สิ้นสุด, THEN THE Expense_Summary_Page SHALL แสดงข้อความแจ้งเตือนว่าวันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด และไม่ดำเนินการกรองข้อมูล
4. THE Expense_Summary_Page SHALL มีปุ่มลัดสำหรับเลือกช่วงเวลาสำเร็จรูปได้แก่: วันนี้, สัปดาห์นี้, เดือนนี้, 3 เดือนล่าสุด, และปีนี้ โดยเมื่อกดปุ่มลัด ระบบ SHALL ตั้งค่าวันที่เริ่มต้นและวันที่สิ้นสุดใน Date_Range_Filter ตามช่วงเวลาที่เลือกและดำเนินการกรองข้อมูลทันที
5. WHILE Expense_Summary_Page กำลังโหลดข้อมูลจากการกรองตามช่วงเวลา, THE Expense_Summary_Page SHALL แสดงสถานะ loading บนพื้นที่ตารางข้อมูลและปิดการใช้งาน Date_Range_Filter จนกว่าการโหลดจะเสร็จสิ้น

### Requirement 3: กรองข้อมูลค่าใช้จ่ายตามหมวดหมู่

**User Story:** As a ผู้จัดการคลังสินค้า, I want to กรองข้อมูลค่าใช้จ่ายตามหมวดหมู่สินค้า, so that ฉันสามารถวิเคราะห์ค่าใช้จ่ายเฉพาะหมวดหมู่ที่สนใจได้

#### Acceptance Criteria

1. THE Expense_Summary_Page SHALL แสดง Category_Filter ที่เป็น multi-select dropdown list แสดงรายการหมวดหมู่สินค้าที่มีสถานะ active ทั้งหมดในระบบ โดยแสดงโครงสร้างลำดับชั้น (parent-child) ด้วยการย่อหน้าตามระดับ
2. WHEN Authenticated_User เลือกหมวดหมู่ใน Category_Filter, THE Expense_Summary_Page SHALL แสดงเฉพาะข้อมูลค่าใช้จ่ายของสินค้าที่อยู่ในหมวดหมู่ที่เลือก รวมถึงสินค้าในหมวดหมู่ย่อยทุกระดับภายใต้หมวดหมู่ที่เลือก ภายในเวลาไม่เกิน 3 วินาที
3. THE Expense_Summary_Page SHALL อนุญาตให้เลือกหลายหมวดหมู่พร้อมกันได้ โดยแสดงจำนวนหมวดหมู่ที่เลือกอยู่บน Category_Filter
4. WHEN Authenticated_User ไม่ได้เลือกหมวดหมู่ใดๆ, THE Expense_Summary_Page SHALL แสดงข้อมูลค่าใช้จ่ายของทุกหมวดหมู่
5. WHEN Authenticated_User เลือกหมวดหมู่ใน Category_Filter ร่วมกับ Date_Range_Filter, THE Expense_Summary_Page SHALL แสดงเฉพาะข้อมูลค่าใช้จ่ายที่ตรงกับทั้งหมวดหมู่ที่เลือกและช่วงวันที่ที่เลือก (เงื่อนไข AND)
6. WHEN Authenticated_User เลือกหมวดหมู่ที่ไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลาที่เลือก, THE Expense_Summary_Page SHALL แสดงข้อความ "ไม่พบข้อมูลค่าใช้จ่ายในหมวดหมู่ที่เลือก" และแสดงมูลค่ารวมเป็น 0 บาท
7. THE Expense_Summary_Page SHALL แสดงปุ่มล้างตัวกรองหมวดหมู่ เพื่อให้ Authenticated_User สามารถยกเลิกการเลือกหมวดหมู่ทั้งหมดได้ในครั้งเดียว

### Requirement 4: แสดงกราฟสรุปค่าใช้จ่าย

**User Story:** As a ผู้จัดการคลังสินค้า, I want to ดูกราฟแสดงค่าใช้จ่ายในรูปแบบภาพ, so that ฉันสามารถเข้าใจสัดส่วนและแนวโน้มค่าใช้จ่ายได้ง่ายขึ้น

#### Acceptance Criteria

1. THE Expense_Summary_Page SHALL แสดง Expense_Chart ในรูปแบบ Pie Chart ที่แสดงสัดส่วนค่าใช้จ่ายแยกตามหมวดหมู่ โดยแสดงแยกแต่ละหมวดหมู่ได้สูงสุด 10 หมวดหมู่ที่มีมูลค่าสูงสุด และรวมหมวดหมู่ที่เหลือไว้ในกลุ่ม "อื่นๆ"
2. THE Expense_Summary_Page SHALL แสดง Expense_Chart ในรูปแบบ Bar Chart ที่แสดงค่าใช้จ่ายรวมของแต่ละหมวดหมู่ โดยแกน X แสดงชื่อหมวดหมู่ และแกน Y แสดงมูลค่าค่าใช้จ่ายเป็นหน่วยบาท เรียงจากมูลค่ามากไปน้อยจากซ้ายไปขวา
3. THE Expense_Summary_Page SHALL แสดง Pie Chart และ Bar Chart พร้อมกันในหน้าเดียวกัน
4. WHEN Authenticated_User เปลี่ยน Date_Range_Filter หรือ Category_Filter, THE Expense_Chart SHALL อัพเดตข้อมูลทั้ง Pie Chart และ Bar Chart ให้แสดงเฉพาะข้อมูลที่ตรงกับตัวกรองที่เลือก ภายในเวลาไม่เกิน 3 วินาที
5. WHEN Authenticated_User นำเมาส์ไปวางบนส่วนของกราฟ (segment ของ Pie Chart หรือ bar ของ Bar Chart), THE Expense_Chart SHALL แสดง tooltip ที่ระบุชื่อหมวดหมู่ มูลค่าในหน่วยบาท (แสดงทศนิยม 2 ตำแหน่ง) และเปอร์เซ็นต์ของค่าใช้จ่ายทั้งหมดในช่วงที่กรอง (แสดงทศนิยม 1 ตำแหน่ง)
6. IF ข้อมูลค่าใช้จ่ายที่กรองมีเพียง 1 หมวดหมู่, THEN THE Expense_Chart SHALL แสดง Pie Chart เป็นวงกลมเต็มของหมวดหมู่นั้น และ Bar Chart แสดง bar เดียวของหมวดหมู่นั้น

### Requirement 5: ส่งออกรายงานค่าใช้จ่าย

**User Story:** As a ผู้จัดการคลังสินค้า, I want to ส่งออกรายงานสรุปค่าใช้จ่ายเป็นไฟล์ PDF หรือ Excel, so that ฉันสามารถเก็บรายงานไว้อ้างอิงหรือส่งต่อให้ผู้อื่นได้

#### Acceptance Criteria

1. THE Expense_Summary_Page SHALL แสดงปุ่มส่งออกรายงาน 2 ปุ่มแยกกัน ได้แก่ ปุ่มส่งออก PDF และปุ่มส่งออก Excel โดยแต่ละปุ่มระบุรูปแบบไฟล์ที่ชัดเจน
2. WHEN Authenticated_User กดปุ่มส่งออก PDF, THE Report_Exporter SHALL สร้างไฟล์ PDF ที่มีข้อมูลค่าใช้จ่ายตามตัวกรองที่เลือกอยู่ในขณะนั้น และเริ่มดาวน์โหลดไฟล์ไปยังเครื่องของผู้ใช้โดยอัตโนมัติ
3. WHEN Authenticated_User กดปุ่มส่งออก Excel, THE Report_Exporter SHALL สร้างไฟล์ Excel (.xlsx) ที่มีข้อมูลค่าใช้จ่ายตามตัวกรองที่เลือกอยู่ในขณะนั้น และเริ่มดาวน์โหลดไฟล์ไปยังเครื่องของผู้ใช้โดยอัตโนมัติ
4. THE Report_Exporter SHALL ตั้งชื่อไฟล์ในรูปแบบ "expense-summary_YYYY-MM-DD.pdf" หรือ "expense-summary_YYYY-MM-DD.xlsx" ตามรูปแบบที่เลือก โดย YYYY-MM-DD คือวันที่ ณ เวลา UTC ที่สร้างรายงาน
5. WHILE Report_Exporter กำลังสร้างไฟล์, THE Expense_Summary_Page SHALL แสดงสถานะ loading บนปุ่มส่งออกที่กดและปิดการใช้งานปุ่มส่งออกทั้งหมด จนกว่าการสร้างไฟล์จะสำเร็จหรือล้มเหลว
6. IF การสร้างรายงานใช้เวลาเกิน 30 วินาที, THEN THE Expense_Summary_Page SHALL ยกเลิกการสร้างรายงาน คืนสถานะปุ่มส่งออกทั้งหมดกลับเป็นพร้อมใช้งาน และแสดงข้อความแจ้งเตือนว่าการสร้างรายงานใช้เวลาเกินกำหนดพร้อมแนะนำให้ลองใหม่
7. IF การสร้างรายงานล้มเหลวด้วยสาเหตุอื่นที่ไม่ใช่ timeout (เช่น เซิร์ฟเวอร์ไม่ตอบสนองหรือเกิดข้อผิดพลาดภายใน), THEN THE Expense_Summary_Page SHALL คืนสถานะปุ่มส่งออกทั้งหมดกลับเป็นพร้อมใช้งาน และแสดงข้อความแจ้งเตือนว่าไม่สามารถสร้างรายงานได้พร้อมแนะนำให้ลองใหม่
8. IF ไม่มีข้อมูลค่าใช้จ่ายที่ตรงกับตัวกรองที่เลือกอยู่, THEN THE Expense_Summary_Page SHALL ปิดการใช้งานปุ่มส่งออกทั้งหมด และแสดงข้อความระบุว่าไม่มีข้อมูลสำหรับส่งออก

### Requirement 6: API สำหรับข้อมูลค่าใช้จ่าย

**User Story:** As a นักพัฒนาระบบ, I want to มี API endpoint ที่ให้ข้อมูลสรุปค่าใช้จ่าย, so that หน้า frontend สามารถดึงข้อมูลไปแสดงผลได้

#### Acceptance Criteria

1. THE Expense_Report_API SHALL ให้บริการ endpoint GET /api/reports/expense-summary ที่รับ query parameters: startDate (รูปแบบ YYYY-MM-DD), endDate (รูปแบบ YYYY-MM-DD), categories (comma-separated, สูงสุด 20 หมวดหมู่), format (ค่าที่รับได้: "json", "pdf", "xlsx") โดย startDate และ endDate เป็น parameter บังคับ และช่วงวันที่ต้องไม่เกิน 365 วัน
2. WHEN Expense_Report_API ได้รับ request ที่มี format เป็น "json", THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 200 และ JSON ที่ประกอบด้วย summary (totalAmount เป็นตัวเลขทศนิยม 2 ตำแหน่ง, totalItems เป็นจำนวนเต็ม, totalCategories เป็นจำนวนเต็ม), categoryBreakdown (อาร์เรย์ของหมวดหมู่ที่มี categoryName, amount, itemCount), และ items (อาร์เรย์ของรายการค่าใช้จ่ายทั้งหมด) ภายในเวลาไม่เกิน 5 วินาที
3. WHEN Expense_Report_API ได้รับ request ที่มี format เป็น "pdf" หรือ "xlsx", THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 200 พร้อม Content-Type header ที่ตรงกับรูปแบบไฟล์ (application/pdf หรือ application/vnd.openxmlformats-officedocument.spreadsheetml.sheet) และ Content-Disposition header สำหรับดาวน์โหลดไฟล์ ภายในเวลาไม่เกิน 30 วินาที
4. IF ผู้ใช้ไม่ได้ส่ง Authorization header หรือ token ไม่ถูกต้องหรือหมดอายุ, THEN THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 401 และข้อความแสดงว่าต้องเข้าสู่ระบบก่อนใช้งาน
5. IF startDate หรือ endDate มีรูปแบบไม่ใช่ YYYY-MM-DD หรือไม่ใช่วันที่จริง หรือ startDate อยู่หลัง endDate, THEN THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 400 และข้อความระบุฟิลด์และสาเหตุที่ผิดพลาด
6. IF parameter format ไม่ได้ส่งมา หรือมีค่าไม่ใช่ "json", "pdf", หรือ "xlsx", THEN THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 400 และข้อความระบุค่า format ที่ถูกต้อง
7. IF การสร้างรายงานใช้เวลาเกิน 30 วินาที, THEN THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 504 และข้อความแสดงว่าการสร้างรายงานใช้เวลาเกินกำหนด
8. WHEN Expense_Report_API ได้รับ request ที่ไม่มีรายการค่าใช้จ่ายในช่วงวันที่ที่ระบุ, THE Expense_Report_API SHALL ตอบกลับด้วย HTTP status 200 และ JSON ที่มี summary แสดง totalAmount เป็น 0, totalItems เป็น 0, totalCategories เป็น 0, categoryBreakdown เป็นอาร์เรย์ว่าง, และ items เป็นอาร์เรย์ว่าง

### Requirement 7: การแสดงผลเมื่อไม่มีข้อมูล

**User Story:** As a ผู้จัดการคลังสินค้า, I want to เห็นข้อความที่ชัดเจนเมื่อไม่มีข้อมูลค่าใช้จ่ายในช่วงที่เลือก, so that ฉันรู้ว่าไม่มีค่าใช้จ่ายในช่วงนั้นแทนที่จะคิดว่าระบบมีปัญหา

#### Acceptance Criteria

1. WHEN ไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลาที่เลือก, THE Expense_Summary_Page SHALL แสดงข้อความ "ไม่พบข้อมูลค่าใช้จ่ายในช่วงเวลาที่เลือก" พร้อม icon ที่สื่อความหมาย
2. WHEN ไม่มีข้อมูลค่าใช้จ่าย, THE Expense_Summary_Page SHALL แสดงมูลค่ารวมเป็น 0 บาทในส่วนสรุปข้อมูล
3. WHEN ไม่มีข้อมูลค่าใช้จ่าย, THE Expense_Chart SHALL แสดงสถานะว่างพร้อมข้อความ "ไม่มีข้อมูลสำหรับแสดงกราฟ"
