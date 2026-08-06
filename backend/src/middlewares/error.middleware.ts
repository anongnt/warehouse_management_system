import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

// Global error handling middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle unknown errors
  console.error('Unhandled error:', err.message);

  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'ระบบไม่สามารถดำเนินการได้ชั่วคราว',
    },
  });
}
