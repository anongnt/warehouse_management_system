# Implementation Plan: Login CRUD System

## Overview

ระบบ Login CRUD สำหรับ Warehouse Management System ประกอบด้วย Backend (Node.js + Express + SQL Server) และ Frontend (React + TypeScript + Tailwind CSS) โดยแบ่ง tasks ตามลำดับการพัฒนาที่ build on top ของ task ก่อนหน้า เริ่มจาก database schema, backend services, API endpoints, จนถึง frontend components

## Tasks

- [ ] 1. ตั้งค่าโครงสร้างโปรเจกต์และ Database Schema
  - [ ] 1.1 สร้างโครงสร้างโฟลเดอร์ Backend และติดตั้ง dependencies
    - สร้างโฟลเดอร์ `src/` สำหรับ backend ประกอบด้วย controllers/, services/, middlewares/, models/, routes/, validators/, utils/, types/
    - ติดตั้ง packages: express, mssql, bcrypt, jsonwebtoken, express-validator, cors, dotenv
    - ติดตั้ง dev packages: typescript, @types/express, @types/bcrypt, @types/jsonwebtoken, jest, ts-jest, fast-check, supertest
    - สร้าง tsconfig.json สำหรับ backend
    - สร้างไฟล์ .env.example สำหรับ configuration (DB connection, JWT secret, etc.)
    - _Requirements: 1.1, 2.1, 7.1_

  - [ ] 1.2 สร้าง Database Schema (SQL Migration Script)
    - สร้างไฟล์ migration สำหรับ Users table (id, email, password_hash, first_name, last_name, role, status, failed_login_attempts, locked_until, created_at, updated_at)
    - สร้างไฟล์ migration สำหรับ Sessions table (id, user_id, token_hash, expires_at, created_at)
    - สร้าง indexes (idx_users_email, idx_users_status, idx_users_name, idx_sessions_user_id, idx_sessions_token_hash, idx_sessions_expires_at)
    - สร้าง seed script สำหรับ default admin account
    - _Requirements: 1.1, 1.4, 2.1, 2.4, 4.1_

  - [ ] 1.3 สร้าง TypeScript interfaces และ types
    - สร้าง DTOs: RegisterDto, LoginDto, ChangePasswordDto, UpdateUserDto, UserQueryDto
    - สร้าง Response types: UserResponse, PaginatedResponse, ErrorResponse, TokenPayload
    - สร้าง Service interfaces: IAuthService, IUserService
    - สร้าง Custom Error classes: ValidationError, NotFoundError, ConflictError, UnauthorizedError, AccountLockedError
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 8.1_

  - [ ] 1.4 สร้าง Database connection module
    - สร้าง database connection pool ด้วย mssql package
    - ตั้งค่า connection string จาก environment variables
    - สร้าง helper functions สำหรับ query execution พร้อม error handling
    - Implement retry logic สำหรับ transient connection errors
    - _Requirements: 1.7, 4.6_

- [ ] 2. Implement Auth Service (Registration & Login)
  - [ ] 2.1 Implement Registration logic ใน Auth Service
    - Validate input data (email format, password length 8-128, firstName/lastName 1-100)
    - ตรวจสอบ email ซ้ำในฐานข้อมูล
    - Hash password ด้วย bcrypt (cost factor 10+)
    - Insert user record ลง Database
    - Return UserResponse (ไม่รวม password_hash)
    - Handle database connection errors ด้วย appropriate error messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write property tests สำหรับ Registration
    - **Property 1: Registration succeeds with valid data**
    - **Property 2: Duplicate email rejection**
    - **Property 3: Password length validation**
    - **Property 4: Password hashing invariant**
    - **Property 5: Email format validation**
    - **Property 6: Name length validation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

  - [ ] 2.3 Implement Login logic ใน Auth Service
    - Validate email/password input
    - ตรวจสอบ account lock status (ถ้า locked_until > current time → reject)
    - เปรียบเทียบ password กับ hash ด้วย bcrypt.compare
    - เมื่อ password ผิด: เพิ่ม failed_login_attempts, ถ้าครบ 5 → lock account 15 นาที
    - เมื่อ login สำเร็จ: reset failed_login_attempts = 0, สร้าง JWT token (24hr expiry) พร้อม userId, email, role, sessionId
    - บันทึก session ลง Sessions table (เก็บ token hash)
    - Return generic error message เมื่อ credentials ไม่ถูกต้อง (ไม่เปิดเผยว่า email หรือ password ผิด)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.4 Write property tests สำหรับ Login
    - **Property 7: Successful login produces valid token**
    - **Property 8: Generic error message on failed login**
    - **Property 9: Failed login counter reset on success**
    - **Property 10: Account locking after 5 failed attempts**
    - **Property 11: Locked account login rejection**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 3. Implement Auth Middleware และ Logout/Change Password
  - [ ] 3.1 Implement Auth Middleware
    - ตรวจสอบ Authorization header (ถ้าไม่มี → 401 "ไม่พบ Token ในคำขอ")
    - Verify JWT format และ signature (ถ้าไม่ถูกต้อง → 401 "Token รูปแบบไม่ถูกต้อง")
    - ตรวจสอบ token expiry (ถ้าหมดอายุ → 401 "Session หมดอายุ")
    - ตรวจสอบ session ในฐานข้อมูล (ถ้าไม่พบ → 401 "Token ถูกยกเลิก")
    - Attach user info (userId, email, role, sessionId) ไปยัง request object
    - สร้าง role-checking middleware สำหรับ admin-only routes (→ 403 "สิทธิ์ไม่เพียงพอ")
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 3.2 Write property tests สำหรับ Auth Middleware
    - **Property 21: Invalid token rejection**
    - **Property 22: Role-based access control**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

  - [ ] 3.3 Implement Logout logic ใน Auth Service
    - ลบ session record จาก Sessions table ตาม token
    - ทำให้ token ใช้งานไม่ได้อีก
    - Handle cases ที่ session ไม่พบ (graceful handling)
    - _Requirements: 3.1_

  - [ ]* 3.4 Write property test สำหรับ Logout
    - **Property 12: Logout invalidates session token**
    - **Validates: Requirements 3.1**

  - [ ] 3.5 Implement Change Password logic ใน Auth Service
    - Validate old password ด้วย bcrypt.compare
    - Validate new password length (8-128 chars)
    - ตรวจสอบ confirmPassword ตรงกับ newPassword
    - ตรวจสอบ newPassword ไม่ซ้ำกับ old password
    - Hash new password และ update ใน Database
    - ลบ sessions ทั้งหมดของ user ยกเว้น session ปัจจุบัน
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 3.6 Write property tests สำหรับ Change Password
    - **Property 23: Password change with valid conditions**
    - **Property 24: Password change rejection on wrong old password**
    - **Property 25: Session cleanup after password change**
    - **Property 26: Password confirmation mismatch rejection**
    - **Property 27: New password same as old rejection**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 4. Checkpoint - ตรวจสอบ Backend Auth
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement User CRUD Service (Admin)
  - [ ] 5.1 Implement findAll (List Users with Pagination & Search)
    - Query users แบบ pagination (OFFSET/FETCH, limit max 20)
    - Implement search filter (partial match บน email, firstName, lastName แบบ case-insensitive)
    - Return PaginatedResponse พร้อม total, page, totalPages
    - ไม่รวม password_hash ใน response
    - Handle database errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Write property tests สำหรับ User List
    - **Property 14: Pagination invariant**
    - **Property 15: Search filter correctness**
    - **Property 16: Password exclusion from responses**
    - **Validates: Requirements 4.1, 4.3, 4.4**

  - [ ] 5.3 Implement update (Update User)
    - Validate input (email format, firstName/lastName ไม่ว่าง)
    - ตรวจสอบ user exists (ถ้าไม่พบ → NotFoundError)
    - ตรวจสอบ email ไม่ซ้ำกับผู้ใช้คนอื่น (→ ConflictError)
    - Update user record พร้อม updated_at = current timestamp
    - ถ้า status เปลี่ยนเป็น 'suspended' → ลบ sessions ทั้งหมดของ user นั้น
    - Return updated UserResponse
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.4 Write property tests สำหรับ Update User
    - **Property 17: Update reflects new values**
    - **Property 18: Session revocation on account suspension**
    - **Validates: Requirements 5.1, 5.3, 5.4**

  - [ ] 5.5 Implement delete (Delete User)
    - ตรวจสอบ user exists (ถ้าไม่พบ → NotFoundError)
    - ตรวจสอบ self-deletion prevention (userId !== requestingAdminId)
    - ลบ sessions ทั้งหมดของ user ก่อน (force logout)
    - ลบ user record จาก Database
    - Handle database errors (rollback ถ้าล้มเหลว)
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.6 Write property tests สำหรับ Delete User
    - **Property 19: User deletion with session cleanup**
    - **Property 20: Self-deletion prevention**
    - **Validates: Requirements 6.2, 6.3, 6.5**

- [ ] 6. Implement API Routes และ Controllers
  - [ ] 6.1 สร้าง Auth Controller และ Routes
    - POST /api/auth/register → AuthController.register (public)
    - POST /api/auth/login → AuthController.login (public)
    - POST /api/auth/logout → AuthController.logout (auth required)
    - POST /api/auth/change-password → AuthController.changePassword (auth required)
    - สร้าง request validation middleware ด้วย express-validator สำหรับแต่ละ endpoint
    - Map service errors เป็น HTTP status codes (400, 401, 409, 423, 500)
    - _Requirements: 1.1, 2.1, 3.1, 8.1, 7.1_

  - [ ] 6.2 สร้าง User Controller และ Routes
    - GET /api/users → UserController.findAll (auth + admin required)
    - GET /api/users/:id → UserController.findById (auth + admin required)
    - PUT /api/users/:id → UserController.update (auth + admin required)
    - DELETE /api/users/:id → UserController.delete (auth + admin required)
    - สร้าง request validation middleware สำหรับ query params และ body
    - Map service errors เป็น HTTP status codes (400, 403, 404, 409, 500)
    - _Requirements: 4.1, 5.1, 6.2, 7.2_

  - [ ] 6.3 สร้าง Express app configuration และ global error handler
    - ตั้งค่า Express app (cors, json parser, routes)
    - สร้าง global error handling middleware (catch all unhandled errors)
    - ไม่ส่ง stack trace ใน production
    - Structured logging (ไม่ log password/token)
    - _Requirements: 1.7, 4.6_

  - [ ]* 6.4 Write integration tests สำหรับ API endpoints
    - ทดสอบ registration flow ด้วย supertest
    - ทดสอบ login/logout flow
    - ทดสอบ user CRUD operations with auth
    - ทดสอบ error responses (401, 403, 404, 409)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.2, 7.1, 7.2_

- [ ] 7. Checkpoint - ตรวจสอบ Backend ทั้งหมด
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. สร้างโครงสร้าง Frontend และ Auth Context
  - [ ] 8.1 ตั้งค่าโครงสร้าง Frontend
    - สร้างโครงสร้าง React app ด้วย TypeScript
    - ติดตั้ง packages: react-router-dom, axios, tailwindcss
    - ตั้งค่า Tailwind CSS configuration
    - สร้างโครงสร้างโฟลเดอร์: pages/, components/, contexts/, services/, types/, hooks/
    - สร้าง API client (Axios instance) พร้อม base URL configuration
    - _Requirements: 2.3, 3.2, 7.4_

  - [ ] 8.2 Implement AuthProvider Context
    - สร้าง AuthContext ที่เก็บ token, user info, login/logout functions
    - เก็บ token ใน localStorage
    - สร้าง Axios interceptor สำหรับ:
      - แนบ Authorization header ทุก request
      - ดัก 401 response → ลบ token + redirect ไป login page
    - สร้าง function ตรวจสอบ token validity เมื่อ app load
    - _Requirements: 3.2, 3.4, 7.4_

  - [ ] 8.3 Implement ProtectedRoute Component
    - สร้าง ProtectedRoute ที่ตรวจสอบ authentication status
    - Redirect ไป login page ถ้าไม่มี valid token
    - รองรับ requiredRole prop สำหรับ admin-only pages
    - แสดง loading state ขณะตรวจสอบ auth
    - _Requirements: 3.4, 7.4_

  - [ ]* 8.4 Write unit tests สำหรับ ProtectedRoute
    - **Property 13: Protected route redirect without token**
    - ทดสอบ redirect เมื่อไม่มี token
    - ทดสอบ role-based access
    - **Validates: Requirements 3.4, 7.4**

- [ ] 9. Implement Frontend Pages - Auth
  - [ ] 9.1 Implement LoginPage
    - สร้าง login form ด้วย Tailwind CSS (email, password fields)
    - Client-side validation (email format, password ไม่ว่าง)
    - เรียก login API และจัดการ response
    - แสดง error messages (credentials ไม่ถูกต้อง, account ถูก lock พร้อมเวลาเหลือ)
    - แสดง loading state ขณะรอ response
    - Redirect ไป dashboard เมื่อ login สำเร็จ
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 9.2 Implement RegisterPage
    - สร้าง registration form (email, password, firstName, lastName)
    - Client-side validation:
      - Email format (มี @ และ domain)
      - Password length (8-128 chars)
      - ชื่อ/นามสกุล (1-100 chars, ไม่ว่าง)
    - เรียก register API และจัดการ response
    - แสดง error messages (email ซ้ำ, validation errors)
    - Redirect ไป login page เมื่อ register สำเร็จ
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ] 9.3 Implement ChangePasswordPage
    - สร้าง change password form (oldPassword, newPassword, confirmPassword)
    - Client-side validation:
      - newPassword length (8-128 chars)
      - confirmPassword ตรงกับ newPassword
      - newPassword ไม่เหมือน oldPassword
    - เรียก change-password API และจัดการ response
    - แสดง success/error messages
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ] 10. Implement Frontend Pages - User Management (Admin)
  - [ ] 10.1 Implement UserListPage
    - สร้างตารางแสดงรายชื่อผู้ใช้ (email, ชื่อ-นามสกุล, สถานะ) ด้วย Tailwind CSS
    - Implement pagination controls (เปลี่ยนหน้า, แสดง current page/total pages)
    - Implement search box (ค้นหาด้วย email/ชื่อ แบบ partial match)
    - แสดง "ไม่พบข้อมูลผู้ใช้" เมื่อไม่พบผลลัพธ์
    - แสดง error message เมื่อ API call ล้มเหลว
    - ปุ่ม Edit และ Delete สำหรับแต่ละ row
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [ ] 10.2 Implement UserFormModal (Edit User)
    - สร้าง Modal form สำหรับแก้ไขข้อมูลผู้ใช้ (email, firstName, lastName, role, status)
    - Client-side validation (email format, ชื่อ/นามสกุลไม่ว่าง)
    - เรียก PUT /api/users/:id API
    - แสดง error messages (email ซ้ำ, user not found, validation errors)
    - อัปเดตรายการผู้ใช้เมื่อบันทึกสำเร็จ
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [ ] 10.3 Implement DeleteConfirmDialog
    - สร้าง confirmation dialog ที่แสดงชื่อผู้ใช้ที่จะลบ
    - ปุ่มยืนยันและปุ่มยกเลิก
    - ป้องกันการลบตัวเอง (ไม่แสดงปุ่มลบสำหรับ admin ที่กำลัง login อยู่ หรือแสดง error)
    - เรียก DELETE /api/users/:id API เมื่อยืนยัน
    - อัปเดตรายการผู้ใช้เมื่อลบสำเร็จ
    - แสดง error message เมื่อลบล้มเหลว
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 11. Implement Logout และ Routing
  - [ ] 11.1 Implement Logout functionality
    - สร้างปุ่ม Logout ใน navigation/header
    - เรียก POST /api/auth/logout API
    - ลบ token จาก localStorage
    - Redirect ไป login page
    - กรณี logout ล้มเหลว: ลบ token ฝั่ง client, แสดงข้อความแจ้งเตือน, redirect ไป login
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 11.2 ตั้งค่า React Router และ Navigation
    - สร้าง route configuration (login, register, dashboard, users, change-password)
    - ใช้ ProtectedRoute สำหรับ pages ที่ต้อง auth
    - ใช้ admin role check สำหรับ user management pages
    - สร้าง layout component พร้อม navigation menu
    - _Requirements: 3.4, 7.4_

- [ ] 12. Final Checkpoint - ตรวจสอบระบบทั้งหมด
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks ที่มีเครื่องหมาย `*` เป็น optional (property tests / unit tests) สามารถข้ามได้สำหรับ MVP
- แต่ละ task อ้างอิง requirements เฉพาะเพื่อ traceability
- Checkpoints ใช้ตรวจสอบความถูกต้องของ code แต่ละช่วง
- Property-based tests ใช้ fast-check library สำหรับ TypeScript
- ทุก API response ใช้ format เดียวกันตาม ErrorResponse interface ใน design
- Password ต้อง hash ด้วย bcrypt ก่อนเก็บลง database เสมอ

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.3"] },
    { "id": 3, "tasks": ["2.2", "2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.5"] },
    { "id": 5, "tasks": ["3.4", "3.6", "5.1", "5.3", "5.5"] },
    { "id": 6, "tasks": ["5.2", "5.4", "5.6", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2"] },
    { "id": 10, "tasks": ["8.3", "8.4"] },
    { "id": 11, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 12, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 13, "tasks": ["11.1", "11.2"] }
  ]
}
```
