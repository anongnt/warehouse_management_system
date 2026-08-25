import { body, query, param } from 'express-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shared: unitCost must not have more than 2 decimal places (same logic as unitPrice)
const maxTwoDecimals = (label: string) => (value: unknown) => {
  const decimalPart = String(value).split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    throw new Error(`${label}ต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง`);
  }
  return true;
};

// Shared: document header fields of every stock document
const documentHeaderValidation = [
  body('documentDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('วันที่เอกสารต้องอยู่ในรูปแบบ ISO 8601'),
  body('note')
    .optional({ values: 'null' })
    .isLength({ max: 1000 }).withMessage('หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร'),
  body('items')
    .isArray({ min: 1, max: 100 }).withMessage('รายการสินค้าต้องมี 1-100 รายการ'),
  body('items.*.productId')
    .matches(UUID_REGEX).withMessage('รูปแบบ productId ไม่ถูกต้อง'),
];

// Validation: Create Receipt
export const createReceiptValidation = [
  ...documentHeaderValidation,
  body('items.*.quantity')
    .notEmpty().withMessage('จำนวนต้องไม่ว่าง')
    .isInt({ min: 1, max: 999999 }).withMessage('จำนวนต้องเป็นจำนวนเต็ม 1-999,999'),
  body('items.*.unitCost')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 999999999.99 }).withMessage('ต้นทุนต่อหน่วยต้องอยู่ระหว่าง 0-999,999,999.99')
    .custom(maxTwoDecimals('ต้นทุนต่อหน่วย')),
];

// Validation: Create Issue (same as receipt, without unitCost)
export const createIssueValidation = [
  ...documentHeaderValidation,
  body('items.*.quantity')
    .notEmpty().withMessage('จำนวนต้องไม่ว่าง')
    .isInt({ min: 1, max: 999999 }).withMessage('จำนวนต้องเป็นจำนวนเต็ม 1-999,999'),
];

// Validation: Create Adjustment
export const createAdjustmentValidation = [
  ...documentHeaderValidation,
  body('items.*.countedQuantity')
    .notEmpty().withMessage('จำนวนที่นับได้ต้องไม่ว่าง')
    .isInt({ min: 0, max: 999999 }).withMessage('จำนวนที่นับได้ต้องเป็นจำนวนเต็ม 0-999,999'),
  body('items.*.reason')
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage('เหตุผลต้องมีความยาว 1-500 ตัวอักษร'),
];

// Validation: Cancel Document
export const cancelDocumentValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage('เหตุผลการยกเลิกต้องมีความยาว 1-500 ตัวอักษร'),
];

// Validation: Stock Balance List
export const stockBalanceListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page ต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit ต้องอยู่ระหว่าง 1-100'),
  query('search')
    .optional()
    .isLength({ max: 200 }).withMessage('คำค้นหาต้องไม่เกิน 200 ตัวอักษร'),
  query('categoryId')
    .optional({ values: 'falsy' })
    .matches(UUID_REGEX).withMessage('รูปแบบ categoryId ไม่ถูกต้อง'),
  query('lowStock')
    .optional()
    .isBoolean().withMessage('lowStock ต้องเป็น true หรือ false'),
  query('threshold')
    .optional()
    .isInt({ min: 0, max: 999999 }).withMessage('threshold ต้องเป็นจำนวนเต็ม 0-999,999'),
];

// Validation: Stock Movement List
export const stockMovementListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page ต้องเป็นจำนวนเต็มที่มากกว่าหรือเท่ากับ 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit ต้องอยู่ระหว่าง 1-100'),
  query('productId')
    .optional({ values: 'falsy' })
    .matches(UUID_REGEX).withMessage('รูปแบบ productId ไม่ถูกต้อง'),
  query('movementType')
    .optional({ values: 'falsy' })
    .isIn(['receipt', 'issue', 'adjustment', 'reversal'])
    .withMessage('ประเภทรายการต้องเป็น receipt, issue, adjustment หรือ reversal'),
  query('startDate')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('startDate ต้องอยู่ในรูปแบบ YYYY-MM-DD'),
  query('endDate')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('endDate ต้องอยู่ในรูปแบบ YYYY-MM-DD')
    .custom((value, { req }) => {
      const startDate = req.query?.startDate as string | undefined;
      if (startDate && value && startDate > value) {
        throw new Error('startDate ต้องไม่มากกว่า endDate');
      }
      return true;
    }),
];

// Validation: productId path param
export const productIdParamValidation = [
  param('productId')
    .matches(UUID_REGEX).withMessage('รูปแบบ productId ไม่ถูกต้อง'),
];

// Validation: document id path param
export const documentIdValidation = [
  param('id')
    .matches(UUID_REGEX).withMessage('รูปแบบ ID ไม่ถูกต้อง'),
];
