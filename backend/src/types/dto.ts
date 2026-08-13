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
  sku?: string;          // optional 1-50 chars, auto-generate if empty
  category: string;      // 1-100 chars
  categoryId?: string;   // UUID, optional - references categories table
  quantity: number;      // integer, 0-999999
  unitPrice: number;     // decimal, 0-999999999.99, max 2 decimals
  description?: string;  // 0-1000 chars
  imageUrl?: string;     // URL path to uploaded image
}

// Update Product DTO (all fields optional)
export interface UpdateProductDto {
  name?: string;
  sku?: string;
  category?: string;
  categoryId?: string | null;
  quantity?: number;
  unitPrice?: number;
  description?: string;
  imageUrl?: string | null;
  status?: 'active' | 'inactive';
}

// Product Query DTO
export interface ProductQueryDto {
  page: number;       // default: 1, min: 1
  limit: number;      // default: 20, min: 1, max: 100
  search?: string;    // partial match on name, sku, category (1-200 chars)
}

// SKU Category Code Mapping (Thai category name → 4-letter code)
export const SKU_CATEGORY_CODES: Record<string, string> = {
  'อิเล็กทรอนิกส์': 'ELEC',
  'อุปกรณ์สำนักงาน': 'OFFC',
  'เครื่องมือช่าง': 'TOOL',
  'วัสดุบรรจุภัณฑ์': 'PACK',
  'อะไหล่และชิ้นส่วน': 'PART',
  'เครื่องใช้ไฟฟ้า': 'APPL',
  'สินค้าอุปโภคบริโภค': 'CONS',
  'เคมีภัณฑ์': 'CHEM',
  'วัตถุดิบ': 'RAWM',
  'อื่นๆ': 'MISC',
};

// --- Category DTOs ---

// Create Category DTO
export interface CreateCategoryDto {
  name: string;          // 1-100 chars, Thai/English/numbers/spaces
  code: string;          // 2-10 uppercase A-Z
  description?: string;  // 0-500 chars
  parentId?: string;     // UUID, optional
}

// Update Category DTO (all fields optional)
export interface UpdateCategoryDto {
  name?: string;
  code?: string;
  description?: string | null;
  parentId?: string | null;
}

// Category Query DTO
export interface CategoryQueryDto {
  flat?: boolean;        // true = flat list, false/undefined = tree
  search?: string;       // partial match on name, code (1-100 chars)
  status?: 'active' | 'inactive';
}
