import { body, query, param } from 'express-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation: Create Category
export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('ชื่อหมวดหมู่ต้องไม่ว่าง')
    .isLength({ min: 1, max: 100 }).withMessage('ชื่อหมวดหมู่ต้องมีความยาว 1-100 ตัวอักษร')
    .matches(/^[\u0E00-\u0E7Fa-zA-Z0-9\s]+$/).withMessage('ชื่อหมวดหมู่ต้องประกอบด้วยตัวอักษรภาษาไทย อังกฤษ ตัวเลข หรือเว้นวรรคเท่านั้น'),
  body('code')
    .trim()
    .notEmpty().withMessage('รหัสหมวดหมู่ต้องไม่ว่าง')
    .isLength({ min: 2, max: 10 }).withMessage('รหัสหมวดหมู่ต้องมีความยาว 2-10 ตัวอักษร')
    .matches(/^[A-Z]+$/).withMessage('รหัสหมวดหมู่ต้องเป็นตัวพิมพ์ใหญ่ A-Z เท่านั้น'),
  body('description')
    .optional({ values: 'null' })
    .isLength({ max: 500 }).withMessage('คำอธิบายต้องไม่เกิน 500 ตัวอักษร'),
  body('parentId')
    .optional({ values: 'null' })
    .matches(UUID_REGEX).withMessage('รูปแบบ parentId ไม่ถูกต้อง'),
];

// Validation: Update Category (all fields optional)
export const updateCategoryValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('ชื่อหมวดหมู่ต้องมีความยาว 1-100 ตัวอักษร')
    .matches(/^[\u0E00-\u0E7Fa-zA-Z0-9\s]+$/).withMessage('ชื่อหมวดหมู่ต้องประกอบด้วยตัวอักษรภาษาไทย อังกฤษ ตัวเลข หรือเว้นวรรคเท่านั้น'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 10 }).withMessage('รหัสหมวดหมู่ต้องมีความยาว 2-10 ตัวอักษร')
    .matches(/^[A-Z]+$/).withMessage('รหัสหมวดหมู่ต้องเป็นตัวพิมพ์ใหญ่ A-Z เท่านั้น'),
  body('description')
    .optional({ values: 'null' })
    .isLength({ max: 500 }).withMessage('คำอธิบายต้องไม่เกิน 500 ตัวอักษร'),
  body('parentId')
    .optional({ values: 'null' })
    .custom((value) => {
      if (value === null) return true;
      if (!UUID_REGEX.test(value)) {
        throw new Error('รูปแบบ parentId ไม่ถูกต้อง');
      }
      return true;
    }),
];

// Validation: Category List (query params)
export const categoryListValidation = [
  query('flat')
    .optional()
    .isIn(['true', 'false']).withMessage('flat ต้องเป็น true หรือ false'),
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 }).withMessage('คำค้นหาต้องมีความยาว 1-100 ตัวอักษร'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('สถานะต้องเป็น active หรือ inactive'),
];

// Validation: Category ID param
export const categoryIdValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
];

// Validation: Update Category Status
export const updateCategoryStatusValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
  body('status')
    .notEmpty().withMessage('สถานะต้องไม่ว่าง')
    .isIn(['active', 'inactive']).withMessage('สถานะต้องเป็น active หรือ inactive เท่านั้น'),
];
