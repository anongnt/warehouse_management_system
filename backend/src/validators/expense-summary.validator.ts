import { query, ValidationChain } from 'express-validator';

// Helper: ตรวจสอบว่าเป็นวันที่จริงในรูปแบบ YYYY-MM-DD
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export const expenseSummaryValidation: ValidationChain[] = [
  query('startDate')
    .notEmpty().withMessage('startDate ต้องไม่ว่าง')
    .isString().withMessage('startDate ต้องเป็นข้อความ')
    .custom((value) => {
      if (!isValidDate(value)) {
        throw new Error('รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD');
      }
      return true;
    }),

  query('endDate')
    .notEmpty().withMessage('endDate ต้องไม่ว่าง')
    .isString().withMessage('endDate ต้องเป็นข้อความ')
    .custom((value, { req }) => {
      if (!isValidDate(value)) {
        throw new Error('รูปแบบวันที่ไม่ถูกต้อง ต้องเป็น YYYY-MM-DD');
      }

      const startDate = req.query?.startDate as string;
      if (startDate && isValidDate(startDate)) {
        // ตรวจสอบ startDate ≤ endDate
        if (startDate > value) {
          throw new Error('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
        }

        // ตรวจสอบช่วงวันที่ ≤ 365 วัน
        const start = new Date(startDate);
        const end = new Date(value);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 365) {
          throw new Error('ช่วงวันที่ต้องไม่เกิน 365 วัน');
        }
      }

      return true;
    }),

  query('categories')
    .optional()
    .isString().withMessage('categories ต้องเป็นข้อความ')
    .custom((value) => {
      if (!value) return true;
      const items = value.split(',').filter((s: string) => s.trim() !== '');
      if (items.length > 20) {
        throw new Error('เลือกหมวดหมู่ได้สูงสุด 20 หมวดหมู่');
      }
      return true;
    }),

  query('format')
    .notEmpty().withMessage('format ต้องไม่ว่าง')
    .isIn(['json', 'pdf', 'xlsx']).withMessage('ค่า format ต้องเป็น json, pdf, หรือ xlsx'),
];
