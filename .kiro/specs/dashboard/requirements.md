# Requirements Document

## Introduction

ฟีเจอร์ Dashboard สำหรับระบบจัดการคลังสินค้า (Warehouse Management System) เพื่อแสดงข้อมูลสรุปภาพรวมของระบบ ประกอบด้วยตัวเลขสำคัญ (KPI) เช่น จำนวนสินค้าทั้งหมด มูลค่าคลังสินค้า จำนวนหมวดหมู่ และสินค้าที่ใกล้หมดสต็อก รวมถึงกราฟแสดงข้อมูลเชิงสถิติ Dashboard นี้ทำงานร่วมกับระบบ Authentication (JWT) ที่มีอยู่แล้ว โดยผู้ใช้ต้องเข้าสู่ระบบก่อนจึงจะเห็นข้อมูลได้

## Glossary

- **Dashboard**: หน้าแสดงผลภาพรวมของระบบจัดการคลังสินค้า ประกอบด้วยตัวเลขสรุป กราฟ และรายการล่าสุด
- **Dashboard_API**: Backend API endpoint ที่รวบรวมข้อมูลสรุปจากฐานข้อมูลเพื่อส่งให้ Dashboard แสดงผล
- **Dashboard_UI**: หน้า Frontend ที่แสดง KPI cards, กราฟ และรายการข้อมูลล่าสุด
- **KPI_Card**: ส่วนแสดงผลตัวเลขสำคัญเช่น จำนวนสินค้า มูลค่าคลัง ในรูปแบบ card
- **Summary_Data**: ข้อมูลสรุปรวมที่คำนวณจากฐานข้อมูล ได้แก่ จำนวนสินค้า มูลค่ารวม จำนวนหมวดหมู่ และสินค้าที่มีสต็อกต่ำ
- **Low_Stock_Product**: สินค้าที่มีจำนวนคงเหลือ (quantity) น้อยกว่าหรือเท่ากับ threshold ที่กำหนด
- **Stock_Threshold**: ค่าจำนวนสินค้าที่ใช้ตัดสินว่าสินค้าใดเป็น Low_Stock_Product (ค่าเริ่มต้น: 10 หน่วย)
- **Inventory_Value**: มูลค่ารวมของสินค้าทั้งหมดในคลัง คำนวณจาก quantity × unit_price ของแต่ละรายการ
- **Auth_Middleware**: middleware ที่ตรวจสอบ JWT token ก่อนอนุญาตให้เข้าถึง API

## Requirements

### Requirement 1: Dashboard Summary API

**User Story:** As a warehouse staff, I want to retrieve summary statistics of the warehouse through an API, so that the dashboard can display up-to-date overview information.

#### Acceptance Criteria

1. WHEN an authenticated user sends a GET request to the dashboard summary endpoint, THE Dashboard_API SHALL return a SuccessResponse containing Summary_Data with the following fields: total active product count (integer), total Inventory_Value (numeric with 2 decimal places), total active category count (integer), and total Low_Stock_Product count (integer)
2. WHEN the Dashboard_API calculates Summary_Data, THE Dashboard_API SHALL compute total active product count as the number of products with status equal to "active"
3. WHEN the Dashboard_API calculates Summary_Data, THE Dashboard_API SHALL compute Inventory_Value by summing (quantity × unit_price) for all products with status equal to "active", rounded to 2 decimal places
4. WHEN the Dashboard_API calculates Summary_Data, THE Dashboard_API SHALL count Low_Stock_Product as products with quantity less than or equal to 10 and status equal to "active"
5. WHEN the Dashboard_API calculates Summary_Data, THE Dashboard_API SHALL compute total active category count as the number of categories with status equal to "active"
6. IF an unauthenticated request is received, THEN THE Dashboard_API SHALL return HTTP status 401 with error code "UNAUTHORIZED"
7. IF a database error occurs while computing Summary_Data, THEN THE Dashboard_API SHALL return HTTP status 500 with error code "INTERNAL_ERROR"
8. THE Dashboard_API SHALL return Summary_Data within 2 seconds for datasets up to 10,000 products

### Requirement 2: Products by Category Distribution

**User Story:** As a warehouse manager, I want to see product distribution across categories, so that I can understand how inventory is organized.

#### Acceptance Criteria

1. WHEN an authenticated user requests category distribution data, THE Dashboard_API SHALL return the count of products with status "active" grouped by their associated category name, excluding products where category_id is NULL
2. THE Dashboard_API SHALL include only categories that have status "active" and contain at least one product with status "active" in the distribution response
3. THE Dashboard_API SHALL sort category distribution results by product count in descending order, and alphabetically by category name in ascending order when two or more categories have equal product counts
4. WHEN an authenticated user requests category distribution data, THE Dashboard_API SHALL return for each category entry: the category name and the product count
5. IF the request lacks a valid authentication token, THEN THE Dashboard_API SHALL return an error response indicating the user is not authenticated

### Requirement 3: Low Stock Products List

**User Story:** As a warehouse staff, I want to see a list of products with low stock levels, so that I can prioritize restocking.

#### Acceptance Criteria

1. WHEN an authenticated user requests low stock products, THE Dashboard_API SHALL return a list of Low_Stock_Product items containing product name, SKU, current quantity, and category, where Low_Stock_Product is defined as a product with quantity ≤ Stock_Threshold (default: 10 units)
2. THE Dashboard_API SHALL limit the low stock products list to a maximum of 10 items, selecting the 10 products with the lowest quantity when more than 10 products qualify
3. THE Dashboard_API SHALL sort low stock products by quantity in ascending order (lowest stock first), using product name in ascending alphabetical order as a tiebreaker when quantities are equal
4. THE Dashboard_API SHALL include only products with status "active" in the low stock list
5. IF the request is made without a valid authentication token, THEN THE Dashboard_API SHALL return an error response indicating the user is not authenticated
6. WHEN an authenticated user requests low stock products and no products meet the low stock threshold, THE Dashboard_API SHALL return an empty list

### Requirement 4: Recent Products List

**User Story:** As a warehouse staff, I want to see recently added products, so that I can track new inventory additions.

#### Acceptance Criteria

1. WHEN an authenticated user requests recent products, THE Dashboard_API SHALL return the 5 most recently created products, each containing: product name, SKU, category, quantity, status, and creation date
2. THE Dashboard_API SHALL sort recent products by creation date in descending order (newest first)
3. THE Dashboard_API SHALL include products of any status (active or inactive) in the recent products list
4. IF fewer than 5 products exist in the system, THEN THE Dashboard_API SHALL return all available products sorted by creation date in descending order
5. IF the request is made without a valid authentication token, THEN THE Dashboard_API SHALL reject the request with an authentication error and SHALL NOT return product data

### Requirement 5: Dashboard UI Layout

**User Story:** As a warehouse staff, I want to see a visually organized dashboard page, so that I can quickly understand the warehouse status at a glance.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the dashboard page, THE Dashboard_UI SHALL display four KPI_Card components showing: total products, total Inventory_Value, total active categories, and Low_Stock_Product count
2. THE Dashboard_UI SHALL display Inventory_Value formatted as Thai Baht currency with the "฿" prefix, comma thousand separators, and exactly 2 decimal places (e.g., ฿1,234,567.89)
3. THE Dashboard_UI SHALL display a pie chart or donut chart showing product distribution by category, where each segment represents one category and is labeled with the category name and product count
4. THE Dashboard_UI SHALL display a table listing up to 10 Low_Stock_Product items sorted by quantity ascending (lowest first) with columns: product name, SKU, quantity, and category
5. THE Dashboard_UI SHALL display a table listing up to 5 recent products sorted by creation date descending (newest first) with columns: product name, SKU, category, quantity, and creation date
6. THE Dashboard_UI SHALL render all dashboard components using Ant Design Card, Table, and Statistic components
7. IF the Dashboard_API returns zero products, THEN THE Dashboard_UI SHALL display "0" for all KPI_Card values and show empty state placeholders in the chart and tables

### Requirement 6: Dashboard Loading and Error States

**User Story:** As a warehouse staff, I want to see appropriate feedback while data is loading or when errors occur, so that I understand the system state.

#### Acceptance Criteria

1. WHILE dashboard data is being fetched from the Dashboard_API, THE Dashboard_UI SHALL display loading indicators (skeleton or spinner) in each data section (KPI_Card area, category distribution chart, low stock table, and recent products table) in place of actual content
2. IF the Dashboard_API does not respond within 30 seconds, THEN THE Dashboard_UI SHALL stop the loading state and display a timeout error message with an option to retry the data fetch
3. IF the Dashboard_API returns an error for one or more endpoints, THEN THE Dashboard_UI SHALL display an error message indicating the failure in the affected section(s) while still rendering successfully loaded sections, and provide a retry option for the failed section(s)
4. IF the network connection fails during data fetch, THEN THE Dashboard_UI SHALL display a connection error message indicating the network is unavailable, with an option to retry the data fetch
5. WHEN the user activates a retry option, THE Dashboard_UI SHALL re-fetch data only for the failed request(s) and display loading indicators in the corresponding section(s) during the retry

### Requirement 7: Dashboard Authentication Integration

**User Story:** As a system administrator, I want the dashboard to be accessible only to authenticated users, so that warehouse data remains secure.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL require a valid JWT token in "Bearer <token>" format in the Authorization header for all dashboard API endpoints, and SHALL reject requests missing a token or containing an invalid/expired token by returning HTTP status 401 with error code "UNAUTHORIZED"
2. IF the Dashboard_UI receives a 401 response from any dashboard API endpoint, THEN THE Dashboard_UI SHALL clear the stored authentication token and redirect the user to the login page within 1 second
3. WHEN a user logs in successfully, THE Dashboard_UI SHALL navigate the user to the dashboard route as the default landing page
4. IF a user navigates to the dashboard route without a stored authentication token, THEN THE Dashboard_UI SHALL redirect the user to the login page without making an API request
