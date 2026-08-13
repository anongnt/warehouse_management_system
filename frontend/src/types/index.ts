// User
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'locked';
  createdAt: string;
  updatedAt: string;
}

// Login Response
export interface LoginResponse {
  token: string;
  user: User;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// API Response
export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>[];
  };
}

// Auth Context
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// --- Product Types ---

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  description: string | null;
  imageUrl: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  sku?: string;  // optional - auto-generate if empty
  category: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  image?: File;
}

export interface UpdateProductPayload {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  description?: string;
  image?: File;
  status?: 'active' | 'inactive';
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedProductResponse {
  data: Product[];
  total: number;
  page: number;
  totalPages: number;
}
