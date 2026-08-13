import request from 'supertest';
import app from '../app';
import { getPool, closePool } from '../database';

// Mock auth middleware
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

const AUTH_HEADER = 'Bearer valid-token';

let codeSeq = Date.now() % 10000000;
function uniqueCode(): string {
  codeSeq++;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'IT';
  let remaining = codeSeq;
  for (let i = 0; i < 5; i++) {
    result += chars[remaining % 26];
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function uniqueName(prefix: string): string {
  codeSeq++;
  return `${prefix}${codeSeq}`;
}

// Cleanup helper
async function cleanupAll() {
  const pool = await getPool();
  await pool.request().query("DELETE FROM products WHERE category_id IN (SELECT id FROM categories WHERE code LIKE 'IT%')");
  await pool.request().query("DELETE FROM products WHERE sku LIKE 'IT%'");
  // Delete leaves first iteratively
  await pool.request().query(`
    WHILE EXISTS (SELECT 1 FROM categories WHERE code LIKE 'IT%')
    BEGIN
      DELETE FROM categories WHERE code LIKE 'IT%' AND id NOT IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id IS NOT NULL AND code LIKE 'IT%');
    END
  `);
}

describe('Category API Integration Tests', () => {
  beforeAll(async () => {
    const pool = await getPool();
    // Ensure categories table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
      BEGIN
        CREATE TABLE categories (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(100) NOT NULL,
          code NVARCHAR(10) NOT NULL,
          description NVARCHAR(500) NULL,
          parent_id UNIQUEIDENTIFIER NULL,
          status NVARCHAR(10) NOT NULL DEFAULT 'active',
          created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
          CONSTRAINT CK_categories_status CHECK (status IN ('active', 'inactive')),
          CONSTRAINT UQ_categories_code UNIQUE (code),
          CONSTRAINT FK_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
        );
      END
      ELSE
      BEGIN
        IF EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_categories_name_parent' AND type = 'UQ')
          ALTER TABLE categories DROP CONSTRAINT UQ_categories_name_parent;
      END
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('products') AND name = 'category_id')
      BEGIN
        ALTER TABLE products ADD category_id UNIQUEIDENTIFIER NULL;
      END
    `);
    // Clean up leftover test data from previous runs
    await cleanupAll();
  });

  afterAll(async () => {
    await cleanupAll();
    await closePool();
  });

  afterEach(async () => {
    await cleanupAll();
  });

  // --- Authentication Tests ---
  describe('Authentication enforcement', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token format is invalid', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'InvalidFormat token123');
      expect(res.status).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', 'Bearer expired-token');
      expect(res.status).toBe(401);
    });

    it('all endpoints require authentication', async () => {
      const endpoints = [
        { method: 'get', url: '/api/categories' },
        { method: 'get', url: '/api/categories/00000000-0000-0000-0000-000000000001' },
        { method: 'post', url: '/api/categories' },
        { method: 'put', url: '/api/categories/00000000-0000-0000-0000-000000000001' },
        { method: 'patch', url: '/api/categories/00000000-0000-0000-0000-000000000001/status' },
        { method: 'delete', url: '/api/categories/00000000-0000-0000-0000-000000000001' },
      ];

      for (const ep of endpoints) {
        const res = await (request(app) as any)[ep.method](ep.url);
        expect(res.status).toBe(401);
      }
    });
  });

  // --- Full CRUD Lifecycle ---
  describe('Full CRUD Lifecycle', () => {
    it('should create → read list → read detail → update → status change → delete', async () => {
      const code = uniqueCode();

      // CREATE
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('TestCat'), code, description: 'Test description' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.code).toBe(code);
      expect(createRes.body.data.status).toBe('active');
      const id = createRes.body.data.id;

      // READ LIST (tree)
      const listRes = await request(app)
        .get('/api/categories')
        .set('Authorization', AUTH_HEADER);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((c: any) => c.id === id);
      expect(found).toBeDefined();

      // READ LIST (flat)
      const flatRes = await request(app)
        .get('/api/categories?flat=true')
        .set('Authorization', AUTH_HEADER);
      expect(flatRes.status).toBe(200);
      const flatFound = flatRes.body.data.find((c: any) => c.id === id);
      expect(flatFound).toBeDefined();
      expect(flatFound.level).toBe(1);

      // READ DETAIL
      const detailRes = await request(app)
        .get(`/api/categories/${id}`)
        .set('Authorization', AUTH_HEADER);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.parent).toBeNull();
      expect(detailRes.body.data.children).toEqual([]);
      expect(detailRes.body.data.productCount).toBe(0);

      // UPDATE
      const updateRes = await request(app)
        .put(`/api/categories/${id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Updated'), description: 'Updated description' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated description');
      expect(updateRes.body.data.code).toBe(code); // code unchanged

      // STATUS CHANGE
      const statusRes = await request(app)
        .patch(`/api/categories/${id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'inactive' });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('inactive');

      // Back to active
      const statusRes2 = await request(app)
        .patch(`/api/categories/${id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'active' });
      expect(statusRes2.status).toBe(200);
      expect(statusRes2.body.data.status).toBe('active');

      // DELETE
      const deleteRes = await request(app)
        .delete(`/api/categories/${id}`)
        .set('Authorization', AUTH_HEADER);
      expect(deleteRes.status).toBe(200);

      // Verify deleted
      const getDeletedRes = await request(app)
        .get(`/api/categories/${id}`)
        .set('Authorization', AUTH_HEADER);
      expect(getDeletedRes.status).toBe(404);
    });
  });

  // --- Circular Reference Detection ---
  describe('Circular reference detection', () => {
    it('should prevent moving A under C when chain is A→B→C', async () => {
      const codeA = uniqueCode();
      const codeB = uniqueCode();
      const codeC = uniqueCode();

      const a = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatA'), code: codeA });
      expect(a.status).toBe(201);
      const b = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatB'), code: codeB, parentId: a.body.data.id });
      expect(b.status).toBe(201);
      const c = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatC'), code: codeC, parentId: b.body.data.id });
      expect(c.status).toBe(201);

      // Try to move A under C (circular)
      const moveRes = await request(app)
        .put(`/api/categories/${a.body.data.id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ parentId: c.body.data.id });

      expect(moveRes.status).toBe(400);
      expect(moveRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent setting category as its own parent', async () => {
      const code = uniqueCode();
      const cat = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('SelfParent'), code });
      expect(cat.status).toBe(201);

      const moveRes = await request(app)
        .put(`/api/categories/${cat.body.data.id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ parentId: cat.body.data.id });

      expect(moveRes.status).toBe(400);
      expect(moveRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- Depth Limit on Move ---
  describe('Depth limit on move', () => {
    it('should reject move that would create depth > 3', async () => {
      const codes = [uniqueCode(), uniqueCode(), uniqueCode(), uniqueCode(), uniqueCode()];

      // Create chain: L1 -> L2 -> L3
      const l1 = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('L1'), code: codes[0] });
      expect(l1.status).toBe(201);
      const l2 = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('L2'), code: codes[1], parentId: l1.body.data.id });
      expect(l2.status).toBe(201);
      const l3 = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('L3'), code: codes[2], parentId: l2.body.data.id });
      expect(l3.status).toBe(201);

      // Create separate chain: X -> Y
      const x = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('X'), code: codes[3] });
      expect(x.status).toBe(201);
      const y = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Y'), code: codes[4], parentId: x.body.data.id });
      expect(y.status).toBe(201);

      // Move X under L3 → X would be level 4, Y would be level 5 → should fail
      const moveRes = await request(app)
        .put(`/api/categories/${x.body.data.id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ parentId: l3.body.data.id });

      expect(moveRes.status).toBe(400);
      expect(moveRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- Delete with Products ---
  describe('Delete with products linked', () => {
    it('should reject deletion when products are linked to category', async () => {
      const code = uniqueCode();
      const catRes = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatWithProd'), code });
      expect(catRes.status).toBe(201);

      // Create product linked to category
      const prodRes = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({
          name: uniqueName('LinkedProd'),
          sku: `IT-PROD-${Date.now()}`,
          category: 'Test',
          categoryId: catRes.body.data.id,
          quantity: 1,
          unitPrice: 10,
        });
      expect(prodRes.status).toBe(201);

      // Try delete category
      const delRes = await request(app)
        .delete(`/api/categories/${catRes.body.data.id}`)
        .set('Authorization', AUTH_HEADER);

      expect(delRes.status).toBe(409);
      expect(delRes.body.error.code).toBe('CONFLICT');

      // Cleanup product
      await request(app).delete(`/api/products/${prodRes.body.data.id}`).set('Authorization', AUTH_HEADER);
    });
  });

  // --- Delete with Subcategories ---
  describe('Delete with subcategories', () => {
    it('should reject deletion when subcategories exist', async () => {
      const code1 = uniqueCode();
      const code2 = uniqueCode();

      const parent = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('ParentCat'), code: code1 });
      expect(parent.status).toBe(201);
      const child = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('ChildCat'), code: code2, parentId: parent.body.data.id });
      expect(child.status).toBe(201);

      // Try delete parent
      const delRes = await request(app)
        .delete(`/api/categories/${parent.body.data.id}`)
        .set('Authorization', AUTH_HEADER);

      expect(delRes.status).toBe(409);
      expect(delRes.body.error.code).toBe('CONFLICT');
    });
  });

  // --- Category Detail Response ---
  describe('Category detail response structure', () => {
    it('should return parent, children, and productCount', async () => {
      const code1 = uniqueCode();
      const code2 = uniqueCode();
      const code3 = uniqueCode();

      const parent = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('DetailParent'), code: code1 });
      expect(parent.status).toBe(201);
      const middle = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('DetailMiddle'), code: code2, parentId: parent.body.data.id });
      expect(middle.status).toBe(201);
      const child = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('DetailChild'), code: code3, parentId: middle.body.data.id });
      expect(child.status).toBe(201);

      // Get detail of middle
      const detailRes = await request(app)
        .get(`/api/categories/${middle.body.data.id}`)
        .set('Authorization', AUTH_HEADER);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.parent).not.toBeNull();
      expect(detailRes.body.data.parent.id).toBe(parent.body.data.id);
      expect(detailRes.body.data.children.length).toBe(1);
      expect(detailRes.body.data.children[0].id).toBe(child.body.data.id);
      expect(detailRes.body.data.productCount).toBe(0);
    });
  });

  // --- Empty Search Results ---
  describe('Empty search results', () => {
    it('should return empty array for search with no matches', async () => {
      const res = await request(app)
        .get('/api/categories?flat=true&search=ZZZNONEXISTENT999')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // --- Product-Category Integration ---
  describe('Product-Category Integration', () => {
    it('should create product with category_id and generate SKU from category code', async () => {
      const code = uniqueCode();
      const catRes = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('SKUCat'), code });
      expect(catRes.status).toBe(201);

      const prodRes = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({
          name: uniqueName('ProdWithCat'),
          category: 'Test',
          categoryId: catRes.body.data.id,
          quantity: 5,
          unitPrice: 100,
        });

      expect(prodRes.status).toBe(201);
      expect(prodRes.body.data.sku).toMatch(new RegExp(`^${code}-\\d{5}$`));

      // Cleanup
      await request(app).delete(`/api/products/${prodRes.body.data.id}`).set('Authorization', AUTH_HEADER);
    });

    it('should reject product with inactive category_id', async () => {
      const code = uniqueCode();
      const catRes = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('InactiveForProd'), code });
      expect(catRes.status).toBe(201);

      // Set inactive
      await request(app)
        .patch(`/api/categories/${catRes.body.data.id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'inactive' });

      const prodRes = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({
          name: uniqueName('ProdFail'),
          category: 'Test',
          categoryId: catRes.body.data.id,
          quantity: 1,
          unitPrice: 10,
        });

      expect(prodRes.status).toBe(400);
    });

    it('should use MISC fallback when category has no code', async () => {
      // Creating product without category_id should fallback to legacy SKU generation
      const prodRes = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({
          name: uniqueName('NoCatProd'),
          category: 'UnknownCategory',
          quantity: 1,
          unitPrice: 10,
        });

      expect(prodRes.status).toBe(201);
      expect(prodRes.body.data.sku).toMatch(/^MISC-\d{5}$/);

      // Cleanup
      await request(app).delete(`/api/products/${prodRes.body.data.id}`).set('Authorization', AUTH_HEADER);
    });

    it('should generate sequential SKUs for same category', async () => {
      const code = uniqueCode();
      const catRes = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('SeqSKUCat'), code });
      expect(catRes.status).toBe(201);

      const prod1 = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('SeqProd1'), category: 'Test', categoryId: catRes.body.data.id, quantity: 1, unitPrice: 10 });

      const prod2 = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('SeqProd2'), category: 'Test', categoryId: catRes.body.data.id, quantity: 1, unitPrice: 10 });

      expect(prod1.status).toBe(201);
      expect(prod2.status).toBe(201);

      // Extract numbers from SKUs
      const num1 = parseInt(prod1.body.data.sku.split('-').pop()!);
      const num2 = parseInt(prod2.body.data.sku.split('-').pop()!);
      expect(num2).toBe(num1 + 1);

      // Cleanup
      await request(app).delete(`/api/products/${prod1.body.data.id}`).set('Authorization', AUTH_HEADER);
      await request(app).delete(`/api/products/${prod2.body.data.id}`).set('Authorization', AUTH_HEADER);
    });
  });
});
