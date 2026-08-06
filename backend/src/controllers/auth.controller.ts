import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { AccountLockedError } from '../utils/errors';

const authService = new AuthService();

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { email, password, firstName, lastName } = req.body;
      const user = await authService.register({ email, password, firstName, lastName });

      res.status(201).json({
        success: true,
        data: user,
        message: 'ลงทะเบียนสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AccountLockedError) {
        res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: error.message,
            details: [{ lockedUntil: error.lockedUntil.toISOString() }],
          },
        });
        return;
      }
      next(error);
    }
  }

  // POST /api/auth/logout
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await authService.logout(token);
      }

      res.status(200).json({
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/change-password
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = (req as any).user!.userId;
      const sessionId = (req as any).user!.sessionId;

      await authService.changePassword(userId, sessionId, { oldPassword, newPassword, confirmPassword });

      res.status(200).json({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }
}
