# Requirements Document

## Introduction

ฟีเจอร์สำหรับการสร้างและปริ้น Report ในระบบ Warehouse Management System โดยผู้ใช้ทุก role (admin และ user) สามารถสร้าง report ของสินค้าคงคลังและ export ออกเป็นไฟล์ PDF หรือ Excel ได้

## Glossary

- **Report_Service**: บริการ backend ที่รับผิดชอบการสร้าง report จากข้อมูลในระบบ
- **Report_Generator**: ส่วนประกอบที่แปลงข้อมูลเป็นไฟล์ report ในรูปแบบต่างๆ (PDF, Excel)
- **Report_UI**: หน้า frontend ที่ให้ผู้ใช้เลือกประเภท report, กรองข้อมูล, และดาวน์โหลดไฟล์
- **Inventory_Report**: รายงานแสดงสินค้าทั้งหมดในระบบพร้อมรายละเอียด (ชื่อ, SKU, จำนวน, ราคา, category, สถานะ)
- **Category_Report**: รายงานแสดงสินค้าจัดกลุ่มตาม category
- **Low_Stock_Report**: รายงานแสดงสินค้าที่มีจำนวนต่ำกว่าเกณฑ์ที่กำหนด
- **Stock_Value_Report**: รายงานแสดงมูลค่ารวมของสินค้าคงคลัง
- **Authenticated_User**: ผู้ใช้ที่ผ่านการ login แล้ว ไม่ว่าจะเป็น role admin หรือ user

## Requirements

### Requirement 1: Inventory Report Generation

**User Story:** As an Authenticated_User, I want to generate an Inventory_Report, so that I can view and print a complete list of all products in the warehouse.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests an Inventory_Report, THE Report_Service SHALL retrieve all active products sorted by category name ascending then product name ascending, including each product's name, SKU, quantity, unit price, category, and status
2. WHEN an Authenticated_User applies multiple filters (category, status) to the Inventory_Report request, THE Report_Service SHALL return only products matching all specified filter conditions combined with AND logic
3. WHEN the Report_Service retrieves product data, THE Report_Generator SHALL format the data into a tabular layout with columns displayed in the following order: SKU, name, category, quantity, unit price, status
4. THE Report_Generator SHALL include the report title, generation date in UTC format (YYYY-MM-DD HH:mm), and total count of products included in the filtered result set in the report header
5. IF the Report_Service retrieves zero products matching the requested filters, THEN THE Report_Generator SHALL display the report header and an empty table with a message indicating no products were found
6. IF the Report_Service fails to retrieve product data within 30 seconds, THEN THE Report_Service SHALL return an error indication to the Authenticated_User and not generate a partial report

### Requirement 2: Category Report Generation

**User Story:** As an Authenticated_User, I want to generate a Category_Report, so that I can see products organized by their categories.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a Category_Report, THE Report_Service SHALL retrieve all active products grouped by their category, with each product including name, SKU, quantity, and unit price
2. THE Report_Generator SHALL display each category as a section header sorted alphabetically by category name, with its products listed underneath sorted by product name in ascending order
3. THE Report_Generator SHALL include a subtotal for each category section showing the product count and the total stock value calculated as the sum of quantity multiplied by unit price for all products in that category
4. WHEN a category filter is applied with one or more category identifiers, THE Report_Service SHALL include only products belonging to the specified categories in the Category_Report
5. IF one or more products have no assigned category, THEN THE Report_Generator SHALL group those products under an "Uncategorized" section displayed at the end of the report

### Requirement 3: Low Stock Report Generation

**User Story:** As an Authenticated_User, I want to generate a Low_Stock_Report, so that I can identify products that need restocking.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a Low_Stock_Report with a threshold value between 1 and 999999, THE Report_Service SHALL retrieve all active products with quantity less than or equal to the specified threshold
2. IF no threshold value is provided, THEN THE Report_Service SHALL use a default threshold of 10 units
3. IF the threshold value is less than 1 or greater than 999999, THEN THE Report_Service SHALL return a 400 Bad Request error indicating the valid range
4. THE Report_Generator SHALL sort the Low_Stock_Report by quantity in ascending order, including each product's name, SKU, category, quantity, and unit price
5. THE Report_Generator SHALL render products with zero quantity using a distinct visual indicator (red text color in PDF, red cell background in Excel)
6. IF no products have quantity at or below the threshold, THEN THE Report_Generator SHALL produce a report with the header and an empty table with a message indicating no low-stock products were found

### Requirement 4: Stock Value Report Generation

**User Story:** As an Authenticated_User, I want to generate a Stock_Value_Report, so that I can see the total monetary value of warehouse inventory.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a Stock_Value_Report, THE Report_Service SHALL calculate the stock value for each product as quantity multiplied by unit price, and return products sorted by stock value in descending order
2. THE Report_Generator SHALL display each product with its name, SKU, category, quantity, unit price, and calculated stock value, and SHALL include a grand total of all stock values at the bottom of the product list
3. WHEN a category filter is applied, THE Report_Service SHALL calculate stock values only for products belonging to the specified categories
4. THE Report_Generator SHALL include a summary section showing total number of distinct products, sum of all product quantities, and total stock value
5. IF no products match the request criteria, THEN THE Report_Generator SHALL produce a report containing the header and summary section with all totals displayed as zero

### Requirement 5: PDF Export

**User Story:** As an Authenticated_User, I want to export reports as PDF files, so that I can print them or share them as documents.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a PDF export, THE Report_Generator SHALL generate a PDF file with A4 page size (210 × 297 mm) and margins of no less than 15 mm on all sides
2. THE Report_Generator SHALL include page numbers in the format "Page X of Y" centered in the PDF footer on every page
3. THE Report_Generator SHALL render text using a sans-serif font at a body size between 10 pt and 12 pt, with table header text rendered in bold
4. IF the report data exceeds one page, THEN THE Report_Generator SHALL paginate the content with table column headers repeated at the top of each subsequent page
5. IF the Report_Generator fails to generate the PDF file, THEN THE Report_Generator SHALL return an error response indicating the reason for the failure without producing a partial or corrupted file

### Requirement 6: Excel Export

**User Story:** As an Authenticated_User, I want to export reports as Excel files, so that I can further analyze the data in a spreadsheet.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests an Excel export, THE Report_Generator SHALL generate a valid XLSX file containing the report data with a filename formatted as {report_type}_{generation_date}
2. THE Report_Generator SHALL format the first row as column headers with bold styling
3. THE Report_Generator SHALL auto-fit column widths to the content with a minimum width of 8 characters and a maximum width of 50 characters
4. THE Report_Generator SHALL format quantity columns as integers with comma thousand separators, and currency columns with 2 decimal places and comma thousand separators
5. IF the Excel export generation fails, THEN THE Report_Generator SHALL return an error response indicating the reason for failure without producing a partial file

### Requirement 7: Report UI Interface

**User Story:** As an Authenticated_User, I want a report page in the application, so that I can select report type, apply filters, and download reports.

#### Acceptance Criteria

1. THE Report_UI SHALL display a report type selector with options: Inventory Report, Category Report, Low Stock Report, Stock Value Report
2. WHEN the Inventory Report type is selected, THE Report_UI SHALL display filter options for category and status; WHEN the Category Report or Stock Value Report type is selected, THE Report_UI SHALL display a filter option for category; WHEN the Low Stock Report type is selected, THE Report_UI SHALL display a filter option for stock threshold with a numeric input defaulting to 10
3. THE Report_UI SHALL provide export format buttons for PDF and Excel
4. IF no report type is selected, THEN THE Report_UI SHALL disable the export format buttons
5. WHEN an Authenticated_User clicks an export button, THE Report_UI SHALL display a loading indicator and disable the export buttons until the report generation completes or fails
6. WHEN the report file is ready, THE Report_UI SHALL trigger a file download in the user's browser and hide the loading indicator
7. IF report generation fails, THEN THE Report_UI SHALL hide the loading indicator, re-enable the export buttons, and display an error message indicating the reason for failure
8. IF report generation does not complete within 30 seconds, THEN THE Report_UI SHALL hide the loading indicator, re-enable the export buttons, and display an error message indicating a timeout occurred

### Requirement 8: Report API Endpoint

**User Story:** As an Authenticated_User, I want a secure API endpoint for report generation, so that reports can be generated on the server and downloaded securely.

#### Acceptance Criteria

1. THE Report_Service SHALL expose a REST API endpoint for each report type under the /api/reports path
2. WHEN an unauthenticated request is received, THE Report_Service SHALL return a 401 Unauthorized response
3. THE Report_Service SHALL accept query parameters for filters (category, status, threshold) and export format (pdf, xlsx), where threshold is a numeric value between 0 and 999,999,999
4. WHEN the requested export format is not supported, THE Report_Service SHALL return a 400 Bad Request response with an error message indicating which formats are supported
5. WHEN a valid report request is received with supported filters and export format, THE Report_Service SHALL return the generated file as a binary response with the appropriate Content-Type header and a Content-Disposition header for file download within 30 seconds
6. IF a filter parameter value is invalid or outside its allowed range, THEN THE Report_Service SHALL return a 400 Bad Request response with an error message indicating which parameter failed validation
7. WHEN the report query matches no data, THE Report_Service SHALL return a valid report file containing only headers and no data rows rather than an error response
