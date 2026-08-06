import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

// Authentication middleware - validates JWT token
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'ไม่พบ Token ในคำขอ' },
      });
      return;
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token รูปแบบไม่ถูกต้อง' },
      });
      return;
    }

    const token = parts[1];
    const payload = await authService.validateToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token ไม่ถูกต้องหรือหมดอายุ' },
      });
      return;
    }

    // Attach user info to request
    (req as any).user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Session หมดอายุ' },
    });
  }
}

// Authorization middleware - checks admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user || (req as any).user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'สิทธิ์ไม่เพียงพอ' },
    });
    return;
  }
  next();
}
