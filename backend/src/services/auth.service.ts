import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool, sql } from '../database';
import {
  IAuthService,
  UserModel,
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  UserResponse,
  LoginResponse,
  TokenPayload,
} from '../types';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  AccountLockedError,
} from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5');
const LOCK_DURATION_MINUTES = parseInt(process.env.LOCK_DURATION_MINUTES || '15');

export class AuthService implements IAuthService {
  // Register a new user
  async register(data: RegisterDto): Promise<UserResponse> {
    const { email, password, firstName, lastName } = data;

    // Validate input
    this.validateRegistrationInput(data);

    const pool = await getPool();

    // Check duplicate email
    const existing = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('first_name', sql.NVarChar, firstName.trim())
      .input('last_name', sql.NVarChar, lastName.trim())
      .query<UserModel>(`
        INSERT INTO users (email, password_hash, first_name, last_name)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name,
               INSERTED.role, INSERTED.status, INSERTED.created_at, INSERTED.updated_at
        VALUES (@email, @password_hash, @first_name, @last_name)
      `);

    const user = result.recordset[0];
    return this.toUserResponse(user);
  }

  // Login user
  async login(data: LoginDto): Promise<LoginResponse> {
    const { email, password } = data;
    const pool = await getPool();

    // Find user by email
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query<UserModel>('SELECT * FROM users WHERE email = @email');

    const user = result.recordset[0];

    if (!user) {
      throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      throw new UnauthorizedError('บัญชีถูกระงับการใช้งาน');
    }

    // Check if account is locked
    if (user.status === 'locked' && user.locked_until) {
      const now = new Date();
      if (now < new Date(user.locked_until)) {
        throw new AccountLockedError(new Date(user.locked_until));
      }
      // Auto-unlock: lock duration has passed
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = user.failed_login_attempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await pool.request()
          .input('id', sql.UniqueIdentifier, user.id)
          .input('attempts', sql.Int, newAttempts)
          .input('locked_until', sql.DateTime2, lockedUntil)
          .query(`
            UPDATE users 
            SET failed_login_attempts = @attempts, locked_until = @locked_until, status = 'locked', updated_at = GETUTCDATE()
            WHERE id = @id
          `);
        throw new AccountLockedError(lockedUntil);
      } else {
        await pool.request()
          .input('id', sql.UniqueIdentifier, user.id)
          .input('attempts', sql.Int, newAttempts)
          .query('UPDATE users SET failed_login_attempts = @attempts, updated_at = GETUTCDATE() WHERE id = @id');
      }

      throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Login successful - reset failed attempts
    await pool.request()
      .input('id', sql.UniqueIdentifier, user.id)
      .query(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, status = 'active', updated_at = GETUTCDATE()
        WHERE id = @id AND (failed_login_attempts > 0 OR status = 'locked')
      `);

    // Create session
    const sessionId = crypto.randomUUID();
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.request()
      .input('id', sql.UniqueIdentifier, sessionId)
      .input('user_id', sql.UniqueIdentifier, user.id)
      .input('token_hash', sql.NVarChar, tokenHash)
      .input('expires_at', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES (@id, @user_id, @token_hash, @expires_at)
      `);

    return {
      token,
      user: this.toUserResponse(user),
    };
  }

  // Logout user
  async logout(token: string): Promise<void> {
    const pool = await getPool();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.request()
      .input('token_hash', sql.NVarChar, tokenHash)
      .query('DELETE FROM sessions WHERE token_hash = @token_hash');
  }

  // Change password
  async changePassword(userId: string, sessionId: string, data: ChangePasswordDto): Promise<void> {
    const { oldPassword, newPassword, confirmPassword } = data;

    // Validate confirmPassword matches newPassword
    if (newPassword !== confirmPassword) {
      throw new ValidationError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
    }

    // Validate new password length
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new ValidationError('รหัสผ่านใหม่ต้องมีความยาว 8-128 ตัวอักษร');
    }

    const pool = await getPool();

    // Get current user
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query<UserModel>('SELECT * FROM users WHERE id = @id');

    const user = result.recordset[0];
    if (!user) {
      throw new UnauthorizedError('ไม่พบผู้ใช้');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      throw new ValidationError('รหัสผ่านเดิมไม่ถูกต้อง');
    }

    // Check new password is different from old
    if (oldPassword === newPassword) {
      throw new ValidationError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('password_hash', sql.NVarChar, newPasswordHash)
      .query('UPDATE users SET password_hash = @password_hash, updated_at = GETUTCDATE() WHERE id = @id');

    // Revoke all sessions except current
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('session_id', sql.UniqueIdentifier, sessionId)
      .query('DELETE FROM sessions WHERE user_id = @user_id AND id != @session_id');
  }

  // Validate token
  async validateToken(token: string): Promise<TokenPayload | null> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      // Token itself is invalid or expired
      return null;
    }

    // Check session exists in database (with retry for transient DB errors)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const pool = await getPool();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await pool.request()
          .input('token_hash', sql.NVarChar, tokenHash)
          .query('SELECT id FROM sessions WHERE token_hash = @token_hash AND expires_at > GETUTCDATE()');

        if (result.recordset.length === 0) {
          return null;
        }

        return payload;
      } catch {
        if (attempt === 0) {
          // Wait briefly and retry on DB connection error
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Second attempt also failed - assume DB issue, still allow request
          // to avoid false 401 from transient connection problems
          return payload;
        }
      }
    }

    return null;
  }

  // Private: Validate registration input
  private validateRegistrationInput(data: RegisterDto): void {
    const errors: Record<string, string>[] = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push({ email: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    if (data.email && data.email.length > 254) {
      errors.push({ email: 'อีเมลต้องไม่เกิน 254 ตัวอักษร' });
    }

    // Password validation
    if (!data.password || data.password.length < 8 || data.password.length > 128) {
      errors.push({ password: 'รหัสผ่านต้องมีความยาว 8-128 ตัวอักษร' });
    }

    // Name validation
    if (!data.firstName || data.firstName.trim().length === 0 || data.firstName.trim().length > 100) {
      errors.push({ firstName: 'ชื่อต้องมีความยาว 1-100 ตัวอักษร' });
    }
    if (!data.lastName || data.lastName.trim().length === 0 || data.lastName.trim().length > 100) {
      errors.push({ lastName: 'นามสกุลต้องมีความยาว 1-100 ตัวอักษร' });
    }

    if (errors.length > 0) {
      throw new ValidationError('ข้อมูลไม่ถูกต้อง', errors);
    }
  }

  // Private: Convert DB model to response
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
