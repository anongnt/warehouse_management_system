import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CategoryService } from '../services/category.service';

const categoryService = new CategoryService();

export class CategoryController {
  // GET /api/categories
  static async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const flat = req.query.flat === 'true';
      const search = req.query.search as string | undefined;
      const status = req.query.status as 'active' | 'inactive' | undefined;

      const result = await categoryService.findAll({ flat, search, status });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categories/:id
  static async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'รูปแบบ ID ไม่ถูกต้อง',
            details: errors.array().map(e => ({ [e.type === 'field' ? (e as any).path : 'general']: e.msg })),
          },
        });
        return;
      }

      const { id } = req.params;
      const category = await categoryService.findById(id);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/categories
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { name, code, description, parentId } = req.body;
      const category = await categoryService.create({ name, code, description, parentId });

      res.status(201).json({
        success: true,
        data: category,
        message: 'สร้างหมวดหมู่สำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categories/:id
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { id } = req.params;
      const updateData = req.body;

      const category = await categoryService.update(id, updateData);

      res.status(200).json({
        success: true,
        data: category,
        message: 'อัปเดตหมวดหมู่สำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/categories/:id/status
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { id } = req.params;
      const { status } = req.body;

      const category = await categoryService.updateStatus(id, status);

      res.status(200).json({
        success: true,
        data: category,
        message: 'อัปเดตสถานะสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categories/:id
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'รูปแบบ ID ไม่ถูกต้อง',
            details: errors.array().map(e => ({ [e.type === 'field' ? (e as any).path : 'general']: e.msg })),
          },
        });
        return;
      }

      const { id } = req.params;
      await categoryService.delete(id);

      res.status(200).json({
        success: true,
        message: 'ลบหมวดหมู่สำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }
}
