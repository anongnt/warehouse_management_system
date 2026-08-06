# Requirements Document

## Introduction

ระบบจัดการข้อมูลสินค้าในคลังสินค้า (Warehouse Product CRUD) เป็นฟีเจอร์สำหรับเพิ่ม ดู แก้ไข และลบข้อมูลสินค้าในระบบจัดการคลังสินค้า ระบบนี้รองรับการจัดการข้อมูลพื้นฐานของสินค้า เช่น ชื่อ, SKU, หมวดหมู่, จำนวน, ราคา และสถานะ โดยเฉพาะผู้ใช้ที่ผ่านการยืนยันตัวตนแล้วเท่านั้นจึงจะสามารถใช้งานได้

## Glossary

- **Product_Service**: บริการ backend ที่จัดการ business logic สำหรับการดำเนินการ CRUD ข้อมูลสินค้า
- **Product_API**: REST API endpoints สำหรับการจัดการข้อมูลสินค้า (/api/products)
- **Product_UI**: หน้า frontend สำหรับแสดงรายการ เพิ่ม แก้ไข และลบสินค้า
- **SKU**: Stock Keeping Unit - รหัสสินค้าที่ไม่ซ้ำกันในระบบ
- **Authenticated_User**: ผู้ใช้ที่ล็อกอินและมี JWT token ที่ยังไม่หมดอายุ
- **Product**: ข้อมูลสินค้าที่เก็บในฐานข้อมูล ประกอบด้วย ชื่อ, SKU, หมวดหมู่, จำนวน, ราคาต่อหน่วย, คำอธิบาย และสถานะ

## Requirements

### Requirement 1: สร้างสินค้าใหม่

**User Story:** As an Authenticated_User, I want to create a new product, so that I can add product information to the warehouse inventory.

#### Acceptance Criteria

1. WHEN an Authenticated_User submits valid product data, THE Product_API SHALL create a new Product record and return the created Product with HTTP status 201
2. THE Product_Service SHALL require the following fields: name (1-200 characters), sku (1-50 characters, alphanumeric, hyphens, and underscores only), category (1-100 characters), quantity (integer >= 0 and <= 999,999), and unit_price (decimal >= 0 and <= 999,999,999.99 with up to 2 decimal places)
3. WHEN an Authenticated_User submits a SKU that already exists in the database, THE Product_API SHALL return an error with HTTP status 409 and message indicating duplicate SKU
4. WHEN an Authenticated_User submits invalid or missing required fields, THE Product_API SHALL return an error with HTTP status 400 and a response body indicating which fields failed validation
5. THE Product_Service SHALL store the description field as optional (0-1000 characters)
6. WHEN a new Product is created, THE Product_Service SHALL set the product status to 'active', and set both created_at and updated_at timestamps to the current server time
7. WHEN a Product is successfully created, THE Product_API SHALL return the complete Product object including id, name, sku, category, quantity, unit_price, description, status, created_at, and updated_at fields

### Requirement 2: ดูรายการสินค้า

**User Story:** As an Authenticated_User, I want to view a list of products with pagination and search, so that I can browse and find products in the warehouse.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests the product list, THE Product_API SHALL return a paginated list of Products with HTTP status 200, including an empty array when no Products match the criteria
2. THE Product_API SHALL support pagination with page and limit query parameters (default: page=1, limit=20, minimum: page=1, limit=1, maximum: limit=100)
3. WHEN an Authenticated_User provides a search query parameter (1-200 characters), THE Product_Service SHALL filter Products by case-insensitive partial match on name, sku, or category
4. THE Product_API SHALL return pagination metadata including total count, current page, total pages, and current limit
5. THE Product_Service SHALL order results by created_at descending (newest first)
6. IF an Authenticated_User provides invalid pagination parameters (non-numeric, page less than 1, or limit outside range 1-100), THEN THE Product_API SHALL return an error with HTTP status 400 and a message indicating the invalid parameter
7. IF an Authenticated_User requests a page number that exceeds the total pages, THEN THE Product_API SHALL return an empty array with correct pagination metadata reflecting total count and total pages

### Requirement 3: ดูรายละเอียดสินค้า

**User Story:** As an Authenticated_User, I want to view the details of a specific product, so that I can see complete product information.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests a Product by valid ID, THE Product_API SHALL return the Product data including id, name, sku, category, quantity, unit_price, description, status, created_at, and updated_at fields with HTTP status 200
2. IF an Authenticated_User requests a Product with a non-existent ID, THEN THE Product_API SHALL return an error with HTTP status 404 and message indicating the Product was not found
3. IF an Authenticated_User requests a Product with an invalid ID format, THEN THE Product_API SHALL return an error with HTTP status 400 and message indicating the ID format is invalid

### Requirement 4: แก้ไขข้อมูลสินค้า

**User Story:** As an Authenticated_User, I want to update product information, so that I can keep the warehouse data accurate and up-to-date.

#### Acceptance Criteria

1. WHEN an Authenticated_User submits valid updated data for an existing Product, THE Product_API SHALL update the Product record and return the updated Product with HTTP status 200
2. THE Product_Service SHALL allow partial updates where only the provided fields are updated; updatable fields are name, sku, category, quantity, unit_price, description, and status
3. WHEN an Authenticated_User updates the SKU to a value that already exists on another Product, THE Product_Service SHALL return an error with HTTP status 409 and message indicating duplicate SKU
4. WHEN an Authenticated_User attempts to update a non-existent Product, THE Product_API SHALL return an error with HTTP status 404
5. THE Product_Service SHALL update the updated_at timestamp to the current server time when any field is modified
6. THE Product_Service SHALL allow updating the status field to either 'active' or 'inactive'; IF an invalid status value is provided, THEN THE Product_API SHALL return an error with HTTP status 400
7. WHEN an Authenticated_User submits invalid field values in an update request, THE Product_API SHALL return an error with HTTP status 400 and a response body indicating which fields failed validation, applying the same constraints as Requirement 1

### Requirement 5: ลบสินค้า

**User Story:** As an Authenticated_User, I want to delete a product, so that I can remove products that are no longer relevant from the system.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests deletion of an existing Product by ID, THE Product_API SHALL permanently remove the Product record from the database and return HTTP status 200 with a message indicating successful deletion
2. WHEN an Authenticated_User attempts to delete a Product with a non-existent ID, THE Product_API SHALL return an error with HTTP status 404 and a message indicating the Product was not found
3. IF an Authenticated_User provides an invalid Product ID format in the delete request, THEN THE Product_API SHALL return an error with HTTP status 400 and a message indicating invalid ID format

### Requirement 6: การยืนยันตัวตน

**User Story:** As a system administrator, I want to ensure only authenticated users can manage products, so that the warehouse data is protected from unauthorized access.

#### Acceptance Criteria

1. WHEN a request without an Authorization header is made to any Product_API endpoint, THE Product_API SHALL return a JSON error response with HTTP status 401 and an error message indicating the token is missing
2. WHEN a request with an Authorization header that does not follow the "Bearer <token>" format is made to any Product_API endpoint, THE Product_API SHALL return a JSON error response with HTTP status 401 and an error message indicating the token format is invalid
3. WHEN a request with an expired or invalid JWT token is made to any Product_API endpoint, THE Product_API SHALL return a JSON error response with HTTP status 401 and an error message indicating the token is invalid or expired
4. THE Product_API SHALL require a valid JWT token in the Authorization header using the Bearer scheme for all product management endpoints

### Requirement 7: หน้า UI สำหรับจัดการสินค้า

**User Story:** As an Authenticated_User, I want a user interface to manage products, so that I can perform CRUD operations through a visual interface.

#### Acceptance Criteria

1. THE Product_UI SHALL display a table of products showing name, SKU, category, quantity, unit_price, status, and created date, sorted by created date descending (newest first)
2. THE Product_UI SHALL provide a search input that filters the product list by sending a request to the Product_API after a debounce delay of 300 milliseconds from the last keystroke
3. THE Product_UI SHALL provide pagination controls displaying the current page number and total pages, with previous and next buttons, defaulting to 20 items per page
4. THE Product_UI SHALL provide a button to open a form modal for creating a new product with input fields for name, SKU, category, quantity, unit_price, description, and status, applying the same validation constraints defined in Requirement 1 before submission
5. THE Product_UI SHALL provide an edit button on each product row that opens a form modal pre-filled with the existing product data, applying the same field validation constraints before submission
6. THE Product_UI SHALL provide a delete button on each product row that opens a confirmation dialog displaying the product name and requiring the user to confirm or cancel before deletion
7. WHEN a CRUD operation succeeds, THE Product_UI SHALL display a success notification for 3 seconds and refresh the product list to reflect the current state
8. IF a CRUD operation fails, THEN THE Product_UI SHALL display the error message from the API response and preserve any user-entered form data without closing the modal
9. WHILE the Product_UI is fetching data from the Product_API, THE Product_UI SHALL display a loading indicator in the table area
10. IF the product list returns zero results, THEN THE Product_UI SHALL display a message indicating no products were found
