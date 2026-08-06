import { getPool, sql } from '../database';
import {
  IUserService,
  UserModel,
  UpdateUserDto,
  UserQueryDto,
  UserResponse,
  PaginatedResponse,
} from '../types';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../utils/errors';

export class UserService implements IUserService {
  // Find all users with pagination and search
  async findAll(query: UserQueryDto): Promise<PaginatedResponse<UserResponse>> {
    const pool = await getPool();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(20, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = '';
    const request = pool.request();

    if (query.search && query.search.trim()) {
      whereClause = `WHERE (
        email LIKE @search OR 
        first_name LIKE @search OR 
        last_name LIKE @search
      )`;
      request.input('search', sql.NVarChar, `%${query.search.trim()}%`);
    }

    // Get total count
    const countResult = await request.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM users ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    // Get paginated data
    const dataRequest = pool.request();
    if (query.search && query.search.trim()) {
      dataRequest.input('search', sql.NVarChar, `%${query.search.trim()}%`);
    }
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const dataResult = await dataRequest.query<UserModel>(
      `SELECT id, email, first_name, last_name, role, status, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
    );

    const users = dataResult.recordset.map(user => this.toUserResponse(user));

    return {
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Find user by ID
  async findById(id: string): Promise<UserResponse | null> {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<UserModel>(
        `SELECT id, email, first_name, last_name, role, status, created_at, updated_at
         FROM users WHERE id = @id`
      );

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toUserResponse(result.recordset[0]);
  }

  // Update user
  async update(id: string, data: UpdateUserDto): Promise<UserResponse> {
    const pool = await getPool();

    // Check user exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<UserModel>('SELECT * FROM users WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบผู้ใช้');
    }

    const user = existing.recordset[0];

    // Validate email if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new ValidationError('รูปแบบอีเมลไม่ถูกต้อง');
      }

      // Check email not taken by another user
      const emailCheck = await pool.request()
        .input('email', sql.NVarChar, data.email.toLowerCase().trim())
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT id FROM users WHERE email = @email AND id != @id');

      if (emailCheck.recordset.length > 0) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
      }
    }

    // Validate names if provided
    if (data.firstName !== undefined && (data.firstName.trim().length === 0 || data.firstName.trim().length > 100)) {
      throw new ValidationError('ชื่อต้องมีความยาว 1-100 ตัวอักษร');
    }
    if (data.lastName !== undefined && (data.lastName.trim().length === 0 || data.lastName.trim().length > 100)) {
      throw new ValidationError('นามสกุลต้องมีความยาว 1-100 ตัวอักษร');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);

    if (data.email) {
      updates.push('email = @email');
      request.input('email', sql.NVarChar, data.email.toLowerCase().trim());
    }
    if (data.firstName) {
      updates.push('first_name = @first_name');
      request.input('first_name', sql.NVarChar, data.firstName.trim());
    }
    if (data.lastName) {
      updates.push('last_name = @last_name');
      request.input('last_name', sql.NVarChar, data.lastName.trim());
    }
    if (data.role) {
      updates.push('role = @role');
      request.input('role', sql.NVarChar, data.role);
    }
    if (data.status) {
      updates.push('status = @status');
      request.input('status', sql.NVarChar, data.status);
    }

    if (updates.length === 0) {
      return this.toUserResponse(user);
    }

    updates.push('updated_at = GETUTCDATE()');

    const result = await request.query<UserModel>(
      `UPDATE users SET ${updates.join(', ')}
       OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name,
              INSERTED.role, INSERTED.status, INSERTED.created_at, INSERTED.updated_at
       WHERE id = @id`
    );

    // If status changed to suspended, revoke all sessions
    if (data.status === 'suspended') {
      await pool.request()
        .input('user_id', sql.UniqueIdentifier, id)
        .query('DELETE FROM sessions WHERE user_id = @user_id');
    }

    return this.toUserResponse(result.recordset[0]);
  }

  // Delete user
  async delete(id: string, requestingAdminId: string): Promise<void> {
    // Prevent self-deletion
    if (id === requestingAdminId) {
      throw new ForbiddenError('ไม่สามารถลบบัญชีตัวเองได้');
    }

    const pool = await getPool();

    // Check user exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id FROM users WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบผู้ใช้');
    }

    // Delete sessions first (cascade should handle this, but explicit for safety)
    await pool.request()
      .input('user_id', sql.UniqueIdentifier, id)
      .query('DELETE FROM sessions WHERE user_id = @user_id');

    // Delete user
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM users WHERE id = @id');
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
