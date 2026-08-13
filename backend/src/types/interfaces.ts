import { RegisterDto, LoginDto, ChangePasswordDto, UpdateUserDto, UserQueryDto, CreateProductDto, UpdateProductDto, ProductQueryDto, CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from './dto';
import { UserResponse, PaginatedResponse, TokenPayload, LoginResponse, ProductResponse, CategoryResponse, CategoryTreeResponse, CategoryFlatResponse, CategoryDetailResponse } from './responses';

// Auth Service Interface
export interface IAuthService {
  register(data: RegisterDto): Promise<UserResponse>;
  login(data: LoginDto): Promise<LoginResponse>;
  logout(token: string): Promise<void>;
  changePassword(userId: string, sessionId: string, data: ChangePasswordDto): Promise<void>;
  validateToken(token: string): Promise<TokenPayload | null>;
}

// User Service Interface
export interface IUserService {
  findAll(query: UserQueryDto): Promise<PaginatedResponse<UserResponse>>;
  findById(id: string): Promise<UserResponse | null>;
  update(id: string, data: UpdateUserDto): Promise<UserResponse>;
  delete(id: string, requestingAdminId: string): Promise<void>;
}

// Database User Model (internal)
export interface UserModel {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'locked';
  failed_login_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Database Session Model (internal)
export interface SessionModel {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

// Product Service Interface
export interface IProductService {
  findAll(query: ProductQueryDto): Promise<PaginatedResponse<ProductResponse>>;
  findById(id: string): Promise<ProductResponse | null>;
  create(data: CreateProductDto): Promise<ProductResponse>;
  update(id: string, data: UpdateProductDto): Promise<ProductResponse>;
  delete(id: string): Promise<void>;
}

// Database Product Model (internal)
export interface ProductModel {
  id: string;
  name: string;
  sku: string;
  category: string;
  category_id: string | null;
  quantity: number;
  unit_price: number;
  description: string | null;
  image_url: string | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

// Database Category Model (internal)
export interface CategoryModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

// Category Service Interface
export interface ICategoryService {
  findAll(query: CategoryQueryDto): Promise<CategoryTreeResponse[] | CategoryFlatResponse[]>;
  findById(id: string): Promise<CategoryDetailResponse>;
  create(data: CreateCategoryDto): Promise<CategoryResponse>;
  update(id: string, data: UpdateCategoryDto): Promise<CategoryResponse>;
  updateStatus(id: string, status: 'active' | 'inactive'): Promise<CategoryResponse>;
  delete(id: string): Promise<void>;
}
