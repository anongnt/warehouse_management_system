import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ProductService } from '../services/product.service';

const productService = new ProductService();

export class ProductController {
  // GET /api/products
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await productService.findAll({ page, limit, search });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/:id
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
      const product = await productService.findById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'ไม่พบสินค้า' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/products
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

      const { name, sku, category, quantity, unitPrice, description } = req.body;
      const product = await productService.create({ name, sku, category, quantity, unitPrice, description });

      res.status(201).json({
        success: true,
        data: product,
        message: 'สร้างสินค้าสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/products/:id
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
      const product = await productService.update(id, updateData);

      res.status(200).json({
        success: true,
        data: product,
        message: 'อัปเดตสินค้าสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/products/:id
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
      await productService.delete(id);

      res.status(200).json({
        success: true,
        message: 'ลบสินค้าสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }
}
