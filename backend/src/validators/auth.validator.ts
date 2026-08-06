import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .isLength({ max: 254 }).withMessage('อีเมลต้องไม่เกิน 254 ตัวอักษร')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('รหัสผ่านต้องมีความยาว 8-128 ตัวอักษร'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('ชื่อต้องมีความยาว 1-100 ตัวอักษร'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('นามสกุลต้องมีความยาว 1-100 ตัวอักษร'),
];

export const loginValidation = [
  body('email')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
];

export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่านเดิม'),
  body('newPassword')
    .isLength({ min: 8, max: 128 }).withMessage('รหัสผ่านใหม่ต้องมีความยาว 8-128 ตัวอักษร'),
  body('confirmPassword')
    .notEmpty().withMessage('กรุณายืนยันรหัสผ่านใหม่'),
];
