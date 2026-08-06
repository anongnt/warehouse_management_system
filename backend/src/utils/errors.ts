// Base Application Error
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string>[];

  constructor(message: string, statusCode: number, code: string, details?: Record<string, string>[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 400 - Validation Error
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message: string = 'ไม่ได้รับอนุญาต') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string = 'สิทธิ์ไม่เพียงพอ') {
    super(message, 403, 'FORBIDDEN');
  }
}

// 404 - Not Found
export class NotFoundError extends AppError {
  constructor(message: string = 'ไม่พบข้อมูล') {
    super(message, 404, 'NOT_FOUND');
  }
}

// 409 - Conflict (duplicate)
export class ConflictError extends AppError {
  constructor(message: string = 'ข้อมูลซ้ำ') {
    super(message, 409, 'CONFLICT');
  }
}

// 423 - Account Locked
export class AccountLockedError extends AppError {
  public readonly lockedUntil: Date;

  constructor(lockedUntil: Date) {
    super('บัญชีถูกล็อกชั่วคราว', 423, 'ACCOUNT_LOCKED');
    this.lockedUntil = lockedUntil;
  }
}
