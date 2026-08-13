// User Response (ไม่รวม password_hash)
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'locked';
  createdAt: Date;
  updatedAt: Date;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Success Response
export interface SuccessResponse<T = undefined> {
  success: true;
  data?: T;
  message?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>[];
  };
}

// Login Response
export interface LoginResponse {
  token: string;
  user: UserResponse;
}

// Token Payload (JWT)
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  sessionId: string;
  exp?: number;
  iat?: number;
}

// Product Response
export interface ProductResponse {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  description: string | null;
  imageUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Category Response (basic)
export interface CategoryResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Category Tree Response (with nested children)
export interface CategoryTreeResponse extends CategoryResponse {
  children: CategoryTreeResponse[];
}

// Category Flat Response (with level info)
export interface CategoryFlatResponse extends CategoryResponse {
  level: number;
}

// Category Detail Response (with parent, children, productCount)
export interface CategoryDetailResponse extends CategoryResponse {
  parent: CategoryResponse | null;
  children: CategoryResponse[];
  productCount: number;
}
