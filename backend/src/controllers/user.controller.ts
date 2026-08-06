import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  // GET /api/users
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

      const result = await userService.findAll({ page, limit, search });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/users/:id
  static async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'ไม่พบผู้ใช้' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/users/:id
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
      const user = await userService.update(id, updateData);

      res.status(200).json({
        success: true,
        data: user,
        message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/users/:id
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const requestingAdminId = (req as any).user!.userId;

      await userService.delete(id, requestingAdminId);

      res.status(200).json({
        success: true,
        message: 'ลบผู้ใช้สำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }
}
