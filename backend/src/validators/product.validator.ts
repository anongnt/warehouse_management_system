import { body, query, param } from 'express-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation: Create Product
export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('ชื่อสินค้าต้องไม่ว่าง')
    .isLength({ min: 1, max: 200 }).withMessage('ชื่อสินค้าต้องมีความยาว 1-200 ตัวอักษร'),
  body('sku')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('SKU ต้องมีความยาว 1-50 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('SKU ต้องประกอบด้วยตัวอักษร ตัวเลข เครื่องหมาย - หรือ _ เท่านั้น'),
  body('category')
    .trim()
    .notEmpty().withMessage('หมวดหมู่ต้องไม่ว่าง')
    .isLength({ min: 1, max: 100 }).withMessage('หมวดหมู่ต้องมีความยาว 1-100 ตัวอักษร'),
  body('quantity')
    .notEmpty().withMessage('จำนวนต้องไม่ว่าง')
    .isInt({ min: 0, max: 999999 }).withMessage('จำนวนต้องเป็นจำนวนเต็ม 0-999,999'),
  body('unitPrice')
    .notEmpty().withMessage('ราคาต่อหน่วยต้องไม่ว่าง')
    .isFloat({ min: 0, max: 999999999.99 }).withMessage('ราคาต่อหน่วยต้องอยู่ระหว่าง 0-999,999,999.99')
    .custom((value) => {
      const str = String(value);
      const decimalPart = str.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error('ราคาต่อหน่วยต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง');
      }
      return true;
    }),
  body('description')
    .optional({ values: 'null' })
    .isLength({ max: 1000 }).withMessage('คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร'),
];

// Validation: Update Product (all fields optional, same constraints when present)
export const updateProductValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('ชื่อสินค้าต้องมีความยาว 1-200 ตัวอักษร'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('SKU ต้องมีความยาว 1-50 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('SKU ต้องประกอบด้วยตัวอักษร ตัวเลข เครื่องหมาย - หรือ _ เท่านั้น'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('หมวดหมู่ต้องมีความยาว 1-100 ตัวอักษร'),
  body('quantity')
    .optional()
    .isInt({ min: 0, max: 999999 }).withMessage('จำนวนต้องเป็นจำนวนเต็ม 0-999,999'),
  body('unitPrice')
    .optional()
    .isFloat({ min: 0, max: 999999999.99 }).withMessage('ราคาต่อหน่วยต้องอยู่ระหว่าง 0-999,999,999.99')
    .custom((value) => {
      const str = String(value);
      const decimalPart = str.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error('ราคาต่อหน่วยต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง');
      }
      return true;
    }),
  body('description')
    .optional({ values: 'null' })
    .isLength({ max: 1000 }).withMessage('คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร'),
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('สถานะต้องเป็น active หรือ inactive'),
];

// Validation: Product List (pagination + search)
export const productListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page ต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit ต้องอยู่ระหว่าง 1-100'),
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 }).withMessage('คำค้นหาต้องมีความยาว 1-200 ตัวอักษร'),
];

// Validation: Product ID param
export const productIdValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
];

// Validation: Update Status
export const updateProductStatusValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
  body('status')
    .notEmpty().withMessage('สถานะต้องไม่ว่าง')
    .isIn(['active', 'inactive']).withMessage('สถานะต้องเป็น active หรือ inactive เท่านั้น'),
];

// Validation: Generate SKU Preview
export const generateSkuPreviewValidation = [
  body('category')
    .trim()
    .notEmpty().withMessage('หมวดหมู่ต้องไม่ว่าง')
    .isLength({ min: 1, max: 100 }).withMessage('หมวดหมู่ต้องมีความยาว 1-100 ตัวอักษร'),
];
