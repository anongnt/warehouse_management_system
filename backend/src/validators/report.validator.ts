import { query } from 'express-validator';

// Validation: Inventory Report
export const inventoryReportValidation = [
  query('format')
    .notEmpty().withMessage('format ต้องไม่ว่าง')
    .isIn(['pdf', 'xlsx']).withMessage('format ต้องเป็น pdf หรือ xlsx'),
  query('category')
    .optional()
    .isString().withMessage('category ต้องเป็นข้อความ')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('category ต้องมีความยาว 1-100 ตัวอักษร'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status ต้องเป็น active หรือ inactive'),
];

// Validation: Category Report
export const categoryReportValidation = [
  query('format')
    .notEmpty().withMessage('format ต้องไม่ว่าง')
    .isIn(['pdf', 'xlsx']).withMessage('format ต้องเป็น pdf หรือ xlsx'),
  query('category')
    .optional()
    .isString().withMessage('category ต้องเป็นข้อความ')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('category ต้องมีความยาว 1-100 ตัวอักษร'),
];

// Validation: Low Stock Report
export const lowStockReportValidation = [
  query('format')
    .notEmpty().withMessage('format ต้องไม่ว่าง')
    .isIn(['pdf', 'xlsx']).withMessage('format ต้องเป็น pdf หรือ xlsx'),
  query('threshold')
    .optional()
    .isInt({ min: 1, max: 999999 }).withMessage('threshold ต้องเป็นจำนวนเต็มระหว่าง 1-999999'),
];

// Validation: Stock Value Report
export const stockValueReportValidation = [
  query('format')
    .notEmpty().withMessage('format ต้องไม่ว่าง')
    .isIn(['pdf', 'xlsx']).withMessage('format ต้องเป็น pdf หรือ xlsx'),
  query('category')
    .optional()
    .isString().withMessage('category ต้องเป็นข้อความ')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('category ต้องมีความยาว 1-100 ตัวอักษร'),
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status ต้องเป็น active หรือ inactive'),
];
