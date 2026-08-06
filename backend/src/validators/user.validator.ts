import { body, query } from 'express-validator';

export const updateUserValidation = [
  body('email')
    .optional()
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .isLength({ max: 254 }).withMessage('อีเมลต้องไม่เกิน 254 ตัวอักษร'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('ชื่อต้องมีความยาว 1-100 ตัวอักษร'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('นามสกุลต้องมีความยาว 1-100 ตัวอักษร'),
  body('role')
    .optional()
    .isIn(['admin', 'user']).withMessage('role ต้องเป็น admin หรือ user'),
  body('status')
    .optional()
    .isIn(['active', 'suspended', 'locked']).withMessage('status ต้องเป็น active, suspended หรือ locked'),
];

export const userListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page ต้องเป็นจำนวนเต็มบวก'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('limit ต้องอยู่ระหว่าง 1-20'),
  query('search')
    .optional()
    .isString(),
];
