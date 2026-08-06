// Registration DTO
export interface RegisterDto {
  email: string;       // max 254 chars
  password: string;    // 8-128 chars
  firstName: string;   // 1-100 chars
  lastName: string;    // 1-100 chars
}

// Login DTO
export interface LoginDto {
  email: string;
  password: string;
}

// Change Password DTO
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;    // 8-128 chars
  confirmPassword: string;
}

// Update User DTO (Admin)
export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended' | 'locked';
}

// User Query DTO (Pagination + Search)
export interface UserQueryDto {
  page: number;         // default: 1
  limit: number;        // default: 20, max: 20
  search?: string;      // partial match on email/firstName/lastName
}

// --- Product DTOs ---

// Create Product DTO
export interface CreateProductDto {
  name: string;          // 1-200 chars
  sku: string;           // 1-50 chars, alphanumeric + hyphens + underscores
  category: string;      // 1-100 chars
  quantity: number;      // integer, 0-999999
  unitPrice: number;     // decimal, 0-999999999.99, max 2 decimals
  description?: string;  // 0-1000 chars
}

// Update Product DTO (all fields optional)
export interface UpdateProductDto {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  description?: string;
  status?: 'active' | 'inactive';
}

// Product Query DTO
export interface ProductQueryDto {
  page: number;       // default: 1, min: 1
  limit: number;      // default: 20, min: 1, max: 100
  search?: string;    // partial match on name, sku, category (1-200 chars)
}
