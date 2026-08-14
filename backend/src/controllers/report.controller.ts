import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ReportService } from '../services/report.service';
import { ReportFormat, ReportFilters } from '../types';

const reportService = new ReportService();

export class ReportController {
  // GET /api/reports/inventory
  static async generateInventoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const format = req.query.format as ReportFormat;
      const filters: ReportFilters = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.status) filters.status = req.query.status as 'active' | 'inactive';

      const result = await reportService.generateReport({
        type: 'inventory',
        format,
        filters,
      });

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
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

  // GET /api/reports/category
  static async generateCategoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const format = req.query.format as ReportFormat;
      const filters: ReportFilters = {};
      if (req.query.category) filters.category = req.query.category as string;

      const result = await reportService.generateReport({
        type: 'category',
        format,
        filters,
      });

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
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

  // GET /api/reports/low-stock
  static async generateLowStockReport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const format = req.query.format as ReportFormat;
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : undefined;

      const result = await reportService.generateReport({
        type: 'low-stock',
        format,
        threshold,
      });

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
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

  // GET /api/reports/stock-value
  static async generateStockValueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const format = req.query.format as ReportFormat;
      const filters: ReportFilters = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.status) filters.status = req.query.status as 'active' | 'inactive';

      const result = await reportService.generateReport({
        type: 'stock-value',
        format,
        filters,
      });

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
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
