import request from 'supertest';
import app from '../app';
import { getPool, closePool } from '../database';

// Mock auth middleware to bypass JWT validation for testing
jest.mock('../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'ไม่พบ Token ในคำขอ' },
      });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token รูปแบบไม่ถูกต้อง' },
      });
    }
    if (parts[1] === 'expired-token') {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token ไม่ถูกต้องหรือหมดอายุ' },
      });
    }
    (req as any).user = { userId: '00000000-0000-0000-0000-000000000001', email: 'test@test.com', role: 'user' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Product API Endpoints', () => {
  const validToken = 'Bearer valid-token';
  let createdProductId: string;

  beforeAll(async () => {
    // Ensure DB connection and products table exist
    const pool = await getPool();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U')
      BEGIN
        CREATE TABLE products (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(200) NOT NULL,
          sku NVARCHAR(50) NOT NULL UNIQUE,
          category NVARCHAR(100) NOT NULL,
          quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity <= 999999),
          unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0 AND unit_price <= 999999999.99),
          description NVARCHAR(1000) NULL,
          status NVARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
        );
      END
    `);
  });

  afterAll(async () => {
    // Cleanup test data
    const pool = await getPool();
    await pool.request().query("DELETE FROM products WHERE sku LIKE 'TEST-%'");
    await closePool();
  });

  // --- Authentication Tests (Requirement 6) ---
  describe('Authentication enforcement', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token format is invalid', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', 'InvalidFormat token123');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is expired', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer expired-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // --- Create Product Tests (Requirement 1) ---
  describe('POST /api/products', () => {
    it('should create product with valid data and return 201', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-CREATE-001',
        category: 'Electronics',
        quantity: 100,
        unitPrice: 29.99,
        description: 'A test product',
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', validToken)
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Test Product',
        sku: 'TEST-CREATE-001',
        category: 'Electronics',
        quantity: 100,
        unitPrice: 29.99,
        status: 'active',
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
      createdProductId = res.body.data.id;
    });

    it('should return 409 for duplicate SKU', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', validToken)
        .send({
          name: 'Another Product',
          sku: 'TEST-CREATE-001',
          category: 'Other',
          quantity: 1,
          unitPrice: 10,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', validToken)
        .send({
          name: '',
          sku: 'invalid sku!',
          category: '',
          quantity: -1,
          unitPrice: -10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });
  });

  // --- Get Product by ID Tests (Requirement 3) ---
  describe('GET /api/products/:id', () => {
    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/00000000-0000-0000-0000-000000000999')
        .set('Authorization', validToken);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/products/not-a-valid-uuid')
        .set('Authorization', validToken);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- Update Product Tests (Requirement 4) ---
  describe('PUT /api/products/:id', () => {
    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .put('/api/products/00000000-0000-0000-0000-000000000999')
        .set('Authorization', validToken)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // --- Delete Product Tests (Requirement 5) ---
  describe('DELETE /api/products/:id', () => {
    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .delete('/api/products/00000000-0000-0000-0000-000000000999')
        .set('Authorization', validToken);

      expect(res.status).toBe(404);
    });
  });

  // --- Pagination Tests (Requirement 2) ---
  describe('GET /api/products (pagination)', () => {
    it('should return empty array with metadata when page exceeds total', async () => {
      const res = await request(app)
        .get('/api/products?page=9999&limit=20')
        .set('Authorization', validToken);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.total).toBeDefined();
      expect(res.body.data.totalPages).toBeDefined();
      expect(res.body.data.page).toBe(9999);
    });
  });
});
