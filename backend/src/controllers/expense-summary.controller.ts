import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ExpenseSummaryService } from '../services/expense-summary.service';
import { ExpenseSummaryFilters } from '../types';

const expenseSummaryService = new ExpenseSummaryService();

export class ExpenseSummaryController {
  // GET /api/reports/expense-summary
  static async getExpenseSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ข้อมูลไม่ถูกต้อง',
            details: errors.array().map(e => ({ [e.type === 'field' ? (e as any).path : 'general']: e.msg })),
          },
        });
        return;
      }

      const format = req.query.format as 'json' | 'pdf' | 'xlsx';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const categoriesParam = req.query.categories as string | undefined;

      const filters: ExpenseSummaryFilters = {
        startDate,
        endDate,
        categories: categoriesParam
          ? categoriesParam.split(',').map(s => s.trim()).filter(s => s !== '')
          : undefined,
      };

      if (format === 'json') {
        // ส่ง JSON response
        const data = await expenseSummaryService.getExpenseSummaryData(filters);
        res.status(200).json({
          success: true,
          data,
        });
      } else if (format === 'pdf') {
        // สร้างและส่ง PDF
        const data = await expenseSummaryService.getExpenseSummaryData(filters);
        const result = await expenseSummaryService.generatePdfReport(data);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.status(200).send(result.buffer);
      } else {
        // สร้างและส่ง Excel
        const data = await expenseSummaryService.getExpenseSummaryData(filters);
        const result = await expenseSummaryService.generateExcelReport(data);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.status(200).send(result.buffer);
      }
    } catch (error: any) {
      if (error.message === 'REPORT_TIMEOUT') {
        res.status(504).json({
          success: false,
          error: { code: 'TIMEOUT', message: 'การสร้างรายงานใช้เวลาเกินกำหนด' },
        });
        return;
      }
      next(error);
    }
  }
}
