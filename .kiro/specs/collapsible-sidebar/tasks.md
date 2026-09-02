# Implementation Plan: Collapsible Sidebar

## Overview

แปลง Top Navbar ของระบบ WMS เป็น Sidebar แนวตั้งที่สามารถ collapse/expand ได้ โดย refactor Layout.tsx และสร้าง components ใหม่ตามที่ออกแบบไว้ใน design document ใช้ TypeScript + React + Tailwind CSS พร้อม unit tests และ property-based tests ด้วย vitest + fast-check

## Tasks

- [ ] 1. สร้าง utility functions และ custom hook พื้นฐาน
  - [ ] 1.1 สร้าง `truncateText` utility function
    - สร้างไฟล์ `frontend/src/utils/truncateText.ts`
    - Implement ฟังก์ชัน `truncateText(text: string, maxLength: number): string`
    - ตัดข้อความที่เกิน maxLength ด้วย '...' คืนค่าเดิมถ้าไม่เกิน
    - _Requirements: 2.1, 2.4_

  - [ ] 1.2 สร้าง `isRouteActive` utility function
    - สร้างไฟล์ `frontend/src/utils/isRouteActive.ts`
    - Implement ฟังก์ชัน `isRouteActive(currentPath: string, menuPath: string): boolean`
    - ใช้ prefix matching สำหรับ nested routes ยกเว้น /dashboard ใช้ exact match
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ] 1.3 สร้าง `useSidebarState` custom hook
    - สร้างไฟล์ `frontend/src/hooks/useSidebarState.ts`
    - Implement state management: isExpanded, isAnimating, isMobileOpen
    - อ่าน/เขียน localStorage key 'sidebar-state'
    - ใช้ lazy initializer ใน useState เพื่อหลีกเลี่ยง flash of wrong state
    - ป้องกัน rapid toggle ด้วย isAnimating flag + setTimeout 300ms
    - ค่าเริ่มต้น: expanded เมื่อไม่มีค่าหรือค่าไม่ถูกต้องใน localStorage
    - try-catch ครอบ localStorage operations ทั้งหมด
    - _Requirements: 4.6, 5.1, 5.2, 5.3, 5.4, 9.5_

  - [ ]* 1.4 เขียน property tests สำหรับ `truncateText`
    - สร้างไฟล์ `frontend/src/utils/truncateText.test.ts`
    - **Property 7: Text truncation with threshold**
    - **Validates: Requirements 2.1, 2.4**
    - ทดสอบ: string เกิน threshold → ผลลัพธ์ไม่เกิน threshold + ellipsis
    - ทดสอบ: string ไม่เกิน threshold → คืนค่าเดิมไม่เปลี่ยนแปลง

  - [ ]* 1.5 เขียน property tests สำหรับ `isRouteActive`
    - สร้างไฟล์ `frontend/src/utils/isRouteActive.test.ts`
    - **Property 5: Active menu item uniqueness and correctness**
    - **Validates: Requirements 6.1, 6.4, 6.5**
    - ทดสอบ: /dashboard ใช้ exact match เท่านั้น
    - ทดสอบ: nested routes ใช้ prefix matching
    - ทดสอบ: จำนวน active items ไม่เกิน 1 สำหรับทุก route

  - [ ]* 1.6 เขียน property tests สำหรับ `useSidebarState`
    - สร้างไฟล์ `frontend/src/hooks/useSidebarState.test.ts`
    - **Property 1: Sidebar state persistence round-trip**
    - **Property 2: Invalid localStorage fallback to expanded**
    - **Property 3: Toggle state inversion**
    - **Property 6: Animation lock idempotence**
    - **Validates: Requirements 4.1, 4.2, 4.6, 5.1, 5.2, 5.3**

- [ ] 2. Checkpoint - ตรวจสอบ utilities และ hook
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. สร้าง Sidebar sub-components
  - [ ] 3.1 สร้าง `Tooltip` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/Tooltip.tsx`
    - แสดง tooltip ด้านขวาเมื่อ hover/focus
    - ใช้ opacity transition ภายใน 300ms
    - รับ prop `enabled` สำหรับเปิด/ปิด tooltip
    - _Requirements: 9.4_

  - [ ] 3.2 สร้าง `SidebarLogo` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/SidebarLogo.tsx`
    - แสดง gradient icon ของ WMS เสมอ
    - แสดงข้อความ "WMS" เฉพาะเมื่อ expanded
    - ซ่อนข้อความเมื่อ collapsed
    - _Requirements: 1.2, 3.6_

  - [ ] 3.3 สร้าง `SidebarNavItem` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/SidebarNavItem.tsx`
    - Render `<Link>` ด้วยไอคอนและข้อความ
    - ซ่อนข้อความเมื่อ collapsed, แสดง tooltip แทน
    - Active state: bg-blue-50 text-blue-700
    - Inactive state: text-gray-600 hover:bg-gray-100
    - ตัดข้อความเกิน 20 ตัวอักษรด้วย truncateText
    - ไอคอนอยู่กึ่งกลางเมื่อ collapsed
    - _Requirements: 2.1, 3.1, 6.1, 6.2, 6.3, 9.4_

  - [ ] 3.4 สร้าง `SidebarAdminSection` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/SidebarAdminSection.tsx`
    - แสดงเฉพาะเมื่อ user.role === 'admin'
    - Conditional render (ไม่ render ใน DOM เมื่อไม่ใช่ admin)
    - แสดงหัวข้อกลุ่มและเส้นแบ่ง (divider) จากกลุ่มเมนูหลัก
    - ไม่แสดงเมื่อ role เป็น undefined
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 3.5 สร้าง `SidebarUserProfile` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/SidebarUserProfile.tsx`
    - Expanded: แสดง avatar (ตัวอักษรแรก firstName), ชื่อ (ตัดที่ 18 ตัวอักษร), role, ปุ่ม logout
    - Collapsed: แสดง avatar + ปุ่ม logout icon, tooltip แสดงชื่อ+role
    - Disable ปุ่ม logout ระหว่าง isLoggingOut
    - Fallback avatar เป็น 'U' เมื่อ user เป็น null
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 2.4, 3.5_

  - [ ] 3.6 สร้าง `SidebarToggleButton` component
    - สร้างไฟล์ `frontend/src/components/Sidebar/SidebarToggleButton.tsx`
    - แสดง ChevronLeft เมื่อ expanded, ChevronRight เมื่อ collapsed
    - aria-label: "ย่อเมนู" เมื่อ expanded, "ขยายเมนู" เมื่อ collapsed
    - อยู่ที่ด้านล่างสุดของ sidebar
    - _Requirements: 4.3, 9.3_

- [ ] 4. ประกอบ Sidebar component หลัก
  - [ ] 4.1 สร้าง `Sidebar` main component
    - สร้างไฟล์ `frontend/src/components/Sidebar/index.tsx`
    - ประกอบ sub-components ทั้งหมด: Logo, Nav, AdminSection, UserProfile, ToggleButton
    - Fixed position, full height (h-screen), z-50
    - Width transition: w-64 (expanded) ↔ w-16 (collapsed)
    - ใช้ transition-all duration-300 ease-in-out
    - ใช้ semantic `<nav>` element พร้อม aria-label
    - Desktop: แสดงตลอด ด้วย translate-x-0
    - Mobile (< 768px): ซ่อน off-screen (-translate-x-full), แสดงเมื่อ isMobileOpen
    - รองรับ keyboard navigation (Tab, Enter)
    - Focus indicator ที่มองเห็นได้ชัดเจน
    - _Requirements: 1.1, 1.4, 2.2, 3.2, 4.4, 4.5, 9.1, 9.2, 9.5_

- [ ] 5. Refactor Layout.tsx และ wire ทุกอย่างเข้าด้วยกัน
  - [ ] 5.1 Refactor `Layout.tsx` ให้ใช้ Sidebar แทน Top Navbar
    - ลบ Top Navbar ทั้งหมด
    - ใช้ useSidebarState hook
    - เพิ่ม isLoggingOut state สำหรับ disable ปุ่ม logout
    - Render Sidebar component พร้อม props ทั้งหมด
    - Main content area ใช้ margin-left: ml-64 (expanded) / ml-16 (collapsed)
    - Main content ใช้ transition-all duration-300 ให้ sync กับ sidebar
    - เพิ่ม MobileMenuButton (hamburger) สำหรับหน้าจอ < 768px
    - เพิ่ม MobileOverlay (backdrop) เมื่อ sidebar เปิดบน mobile
    - ลบ max-w-7xl constraint เพื่อให้ content ใช้พื้นที่เต็ม
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 3.4, 4.4, 4.5, 5.1, 5.2, 8.4, 9.5_

- [ ] 6. Checkpoint - ตรวจสอบการ render และ functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. เขียน unit tests สำหรับ Sidebar components
  - [ ]* 7.1 เขียน unit tests สำหรับ Sidebar rendering
    - สร้างไฟล์ `frontend/src/components/Sidebar/Sidebar.test.tsx`
    - ทดสอบ expanded state แสดง w-64
    - ทดสอบ collapsed state แสดง w-16
    - ทดสอบข้อความเมนูซ่อนเมื่อ collapsed
    - ทดสอบ toggle button เปลี่ยน aria-label ตาม state
    - ทดสอบ navigation links ทั้งหมดถูก render
    - _Requirements: 1.3, 2.1, 2.2, 3.1, 3.2, 4.3, 9.1, 9.3_

  - [ ]* 7.2 เขียน property tests สำหรับ admin visibility
    - สร้างไฟล์ `frontend/src/components/Sidebar/Sidebar.property.test.tsx`
    - **Property 4: Admin menu visibility determined by role**
    - **Validates: Requirements 7.1, 7.2, 7.4**
    - ทดสอบ: admin role → admin section ใน DOM
    - ทดสอบ: non-admin/null/undefined → admin section ไม่อยู่ใน DOM

  - [ ]* 7.3 เขียน unit tests สำหรับ user profile และ active state
    - เพิ่มใน `frontend/src/components/Sidebar/Sidebar.test.tsx`
    - ทดสอบ expanded: แสดงชื่อ, role, avatar, ปุ่ม logout
    - ทดสอบ collapsed: แสดงเฉพาะ avatar + logout icon
    - ทดสอบ active menu item highlight ตาม current route
    - ทดสอบ logout button disabled ระหว่าง loading
    - ทดสอบชื่อยาวเกินถูกตัดด้วย ellipsis
    - _Requirements: 6.1, 6.2, 6.3, 8.2, 8.3, 8.5_

  - [ ]* 7.4 เขียน unit tests สำหรับ responsive behavior
    - เพิ่มใน `frontend/src/components/Sidebar/Sidebar.test.tsx`
    - ทดสอบ mobile: sidebar ซ่อน, แสดงปุ่ม hamburger
    - ทดสอบ กดปุ่ม hamburger → sidebar แสดง overlay + backdrop
    - ทดสอบ กด backdrop → sidebar ปิด
    - _Requirements: 9.5_

- [ ] 8. Final checkpoint - ตรวจสอบทั้งหมด
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks ที่มีเครื่องหมาย `*` เป็น optional สามารถข้ามได้เพื่อ MVP ที่เร็วขึ้น
- ทุก task อ้างอิง requirements เฉพาะเพื่อ traceability
- Checkpoints ใช้ตรวจสอบความถูกต้องแบบ incremental
- Property tests ใช้ `fast-check` library ที่มีอยู่แล้วใน devDependencies
- Unit tests ใช้ `vitest` + `@testing-library/react`
- ใช้ TypeScript ทั้งหมดสำหรับ implementation
- Design document มี pseudocode/implementation details ครบถ้วน สามารถใช้อ้างอิงระหว่าง implementation ได้

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "3.1", "3.2", "3.6"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
