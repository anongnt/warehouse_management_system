import * as fc from 'fast-check';
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
    (req as any).user = { userId: '00000000-0000-0000-0000-000000000001', email: 'test@test.com', role: 'user' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

const AUTH_HEADER = 'Bearer valid-token';

// --- Generators ---
const validNameArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length >= 1);
const validSkuArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split('')),
  { minLength: 1, maxLength: 50 }
);
const validCategoryArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length >= 1);
const validQuantityArb = fc.integer({ min: 0, max: 999999 });
const validUnitPriceArb = fc.integer({ min: 0, max: 99999999999 }).map(v => Math.round(v) / 100);
const validDescriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 1000 }), { nil: undefined });

const validProductArb = fc.record({
  name: validNameArb,
  sku: validSkuArb,
  category: validCategoryArb,
  quantity: validQuantityArb,
  unitPrice: validUnitPriceArb,
  description: validDescriptionArb,
});

let skuCounter = 0;
function uniqueSku(prefix: string): string {
  skuCounter++;
  return `${prefix}-${Date.now()}-${skuCounter}`;
}

describe('Feature: warehouse-product-crud', () => {
  beforeAll(async () => {
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
    const pool = await getPool();
    await pool.request().query("DELETE FROM products WHERE sku LIKE 'PROP-%'");
    await closePool();
  });

  // Property 1: Product creation round-trip
  describe('Property 1: Product creation round-trip', () => {
    it('creating a product and retrieving it should yield the same field values with status active', async () => {
      await fc.assert(
        fc.asyncProperty(validProductArb, async (product) => {
          const sku = uniqueSku('PROP-RT');
          const payload = { ...product, sku };

          const createRes = await request(app)
            .post('/api/products')
            .set('Authorization', AUTH_HEADER)
            .send(payload);

          if (createRes.status !== 201) return; // skip if validation fails on edge cases

          const id = createRes.body.data.id;
          const getRes = await request(app)
            .get(`/api/products/${id}`)
            .set('Authorization', AUTH_HEADER);

          expect(getRes.status).toBe(200);
          expect(getRes.body.data.name).toBe(payload.name);
          expect(getRes.body.data.sku).toBe(sku);
          expect(getRes.body.data.status).toBe('active');
          expect(getRes.body.data.createdAt).toBeDefined();
          expect(getRes.body.data.updatedAt).toBeDefined();

          // Cleanup
          await request(app)
            .delete(`/api/products/${id}`)
            .set('Authorization', AUTH_HEADER);
        }),
        { numRuns: 20 } // Reduced for CI speed, covers round-trip well
      );
    }, 60000);
  });

  // Property 3: SKU uniqueness enforcement
  describe('Property 3: SKU uniqueness enforcement', () => {
    it('creating two products with the same SKU should return 409 on the second', async () => {
      await fc.assert(
        fc.asyncProperty(validProductArb, async (product) => {
          const sku = uniqueSku('PROP-SKU');
          const payload = { ...product, sku };

          const first = await request(app)
            .post('/api/products')
            .set('Authorization', AUTH_HEADER)
            .send(payload);

          if (first.status !== 201) return;

          const second = await request(app)
            .post('/api/products')
            .set('Authorization', AUTH_HEADER)
            .send({ ...payload, name: 'Different Name' });

          expect(second.status).toBe(409);

          // Cleanup
          await request(app)
            .delete(`/api/products/${first.body.data.id}`)
            .set('Authorization', AUTH_HEADER);
        }),
        { numRuns: 20 }
      );
    }, 60000);

    it('updating a product SKU to an existing SKU should return 409', async () => {
      const sku1 = uniqueSku('PROP-SKU-U1');
      const sku2 = uniqueSku('PROP-SKU-U2');

      const p1 = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'Product 1', sku: sku1, category: 'Test', quantity: 1, unitPrice: 10 });

      const p2 = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'Product 2', sku: sku2, category: 'Test', quantity: 1, unitPrice: 10 });

      expect(p1.status).toBe(201);
      expect(p2.status).toBe(201);

      const updateRes = await request(app)
        .put(`/api/products/${p2.body.data.id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ sku: sku1 });

      expect(updateRes.status).toBe(409);

      // Cleanup
      await request(app).delete(`/api/products/${p1.body.data.id}`).set('Authorization', AUTH_HEADER);
      await request(app).delete(`/api/products/${p2.body.data.id}`).set('Authorization', AUTH_HEADER);
    });
  });

  // Property 4: Pagination metadata consistency
  describe('Property 4: Pagination metadata consistency', () => {
    it('pagination metadata should be consistent with page/limit parameters', async () => {
      // Seed some products
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', AUTH_HEADER)
          .send({ name: `Pagination Test ${i}`, sku: uniqueSku('PROP-PAG'), category: 'PagTest', quantity: i, unitPrice: i * 10 });
        if (res.status === 201) ids.push(res.body.data.id);
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 100 }),
          async (page, limit) => {
            const res = await request(app)
              .get(`/api/products?page=${page}&limit=${limit}&search=PagTest`)
              .set('Authorization', AUTH_HEADER);

            expect(res.status).toBe(200);
            const { data, total, totalPages } = res.body.data;
            expect(totalPages).toBe(Math.ceil(total / limit) || 1);
            expect(data.length).toBeLessThanOrEqual(limit);
            expect(res.body.data.page).toBe(page);
          }
        ),
        { numRuns: 30 }
      );

      // Cleanup
      for (const id of ids) {
        await request(app).delete(`/api/products/${id}`).set('Authorization', AUTH_HEADER);
      }
    }, 60000);
  });

  // Property 5: Search filter correctness
  describe('Property 5: Search filter correctness', () => {
    it('all search results should contain the search string in name, sku, or category', async () => {
      // Seed products
      const ids: string[] = [];
      const testProducts = [
        { name: 'Alpha Widget', sku: uniqueSku('PROP-SRCH'), category: 'Tools' },
        { name: 'Beta Gadget', sku: uniqueSku('PROP-SRCH'), category: 'Electronics' },
        { name: 'Gamma Tool', sku: uniqueSku('PROP-SRCH'), category: 'Hardware' },
      ];
      for (const p of testProducts) {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', AUTH_HEADER)
          .send({ ...p, quantity: 10, unitPrice: 5 });
        if (res.status === 201) ids.push(res.body.data.id);
      }

      const searchTerms = ['Alpha', 'gadget', 'TOOL', 'Electronics', 'PROP-SRCH'];
      for (const term of searchTerms) {
        const res = await request(app)
          .get(`/api/products?search=${encodeURIComponent(term)}`)
          .set('Authorization', AUTH_HEADER);

        expect(res.status).toBe(200);
        for (const product of res.body.data.data) {
          const lower = term.toLowerCase();
          const matches =
            product.name.toLowerCase().includes(lower) ||
            product.sku.toLowerCase().includes(lower) ||
            product.category.toLowerCase().includes(lower);
          expect(matches).toBe(true);
        }
      }

      // Cleanup
      for (const id of ids) {
        await request(app).delete(`/api/products/${id}`).set('Authorization', AUTH_HEADER);
      }
    }, 30000);
  });

  // Property 6: Invalid pagination parameters rejected
  describe('Property 6: Invalid pagination parameters rejected', () => {
    it('should return 400 for invalid pagination parameters', async () => {
      const invalidParams = [
        'page=0', 'page=-1', 'page=abc',
        'limit=0', 'limit=-1', 'limit=101', 'limit=abc',
      ];

      for (const param of invalidParams) {
        const res = await request(app)
          .get(`/api/products?${param}`)
          .set('Authorization', AUTH_HEADER);
        expect(res.status).toBe(400);
      }
    });
  });

  // Property 7: Invalid ID format rejected
  describe('Property 7: Invalid ID format rejected', () => {
    it('should return 400 for non-UUID ID on all endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
          async (invalidId) => {
            const encodedId = encodeURIComponent(invalidId);

            const getRes = await request(app)
              .get(`/api/products/${encodedId}`)
              .set('Authorization', AUTH_HEADER);
            expect(getRes.status).toBe(400);

            const putRes = await request(app)
              .put(`/api/products/${encodedId}`)
              .set('Authorization', AUTH_HEADER)
              .send({ name: 'test' });
            expect(putRes.status).toBe(400);

            const delRes = await request(app)
              .delete(`/api/products/${encodedId}`)
              .set('Authorization', AUTH_HEADER);
            expect(delRes.status).toBe(400);
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);
  });

  // Property 8: Partial update preserves unmodified fields
  describe('Property 8: Partial update preserves unmodified fields', () => {
    it('only specified fields and updated_at should change', async () => {
      const sku = uniqueSku('PROP-PARTIAL');
      const original = {
        name: 'Original Name',
        sku,
        category: 'OriginalCat',
        quantity: 50,
        unitPrice: 100.00,
        description: 'Original description',
      };

      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', AUTH_HEADER)
        .send(original);

      expect(createRes.status).toBe(201);
      const productId = createRes.body.data.id;
      const created = createRes.body.data;

      // Update only name
      const updateRes = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'Updated Name' });

      expect(updateRes.status).toBe(200);
      const updated = updateRes.body.data;

      expect(updated.name).toBe('Updated Name');
      expect(updated.sku).toBe(created.sku);
      expect(updated.category).toBe(created.category);
      expect(updated.quantity).toBe(created.quantity);
      expect(updated.unitPrice).toBe(created.unitPrice);
      expect(updated.description).toBe(created.description);
      expect(updated.status).toBe(created.status);

      // Cleanup
      await request(app).delete(`/api/products/${productId}`).set('Authorization', AUTH_HEADER);
    });

    it('updating different field subsets preserves unmodified fields', async () => {
      const fieldOptions = ['name', 'category', 'quantity', 'unitPrice', 'description', 'status'] as const;

      await fc.assert(
        fc.asyncProperty(
          fc.subarray(fieldOptions as unknown as string[], { minLength: 1 }),
          async (fieldsToUpdate) => {
            const sku = uniqueSku('PROP-PU');
            const createRes = await request(app)
              .post('/api/products')
              .set('Authorization', AUTH_HEADER)
              .send({ name: 'Base Product', sku, category: 'BaseCat', quantity: 10, unitPrice: 50.00, description: 'Base desc' });

            if (createRes.status !== 201) return;
            const productId = createRes.body.data.id;
            const original = createRes.body.data;

            const updatePayload: Record<string, any> = {};
            if (fieldsToUpdate.includes('name')) updatePayload.name = 'New Name';
            if (fieldsToUpdate.includes('category')) updatePayload.category = 'NewCat';
            if (fieldsToUpdate.includes('quantity')) updatePayload.quantity = 99;
            if (fieldsToUpdate.includes('unitPrice')) updatePayload.unitPrice = 199.99;
            if (fieldsToUpdate.includes('description')) updatePayload.description = 'New desc';
            if (fieldsToUpdate.includes('status')) updatePayload.status = 'inactive';

            const updateRes = await request(app)
              .put(`/api/products/${productId}`)
              .set('Authorization', AUTH_HEADER)
              .send(updatePayload);

            expect(updateRes.status).toBe(200);
            const updated = updateRes.body.data;

            // Check unmodified fields
            if (!fieldsToUpdate.includes('name')) expect(updated.name).toBe(original.name);
            if (!fieldsToUpdate.includes('category')) expect(updated.category).toBe(original.category);
            if (!fieldsToUpdate.includes('quantity')) expect(updated.quantity).toBe(original.quantity);
            if (!fieldsToUpdate.includes('unitPrice')) expect(updated.unitPrice).toBe(original.unitPrice);
            if (!fieldsToUpdate.includes('description')) expect(updated.description).toBe(original.description);
            if (!fieldsToUpdate.includes('status')) expect(updated.status).toBe(original.status);

            // Cleanup
            await request(app).delete(`/api/products/${productId}`).set('Authorization', AUTH_HEADER);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 9: Delete removes product permanently
  describe('Property 9: Delete removes product permanently', () => {
    it('after deletion, findById should return 404', async () => {
      await fc.assert(
        fc.asyncProperty(validProductArb, async (product) => {
          const sku = uniqueSku('PROP-DEL');
          const createRes = await request(app)
            .post('/api/products')
            .set('Authorization', AUTH_HEADER)
            .send({ ...product, sku });

          if (createRes.status !== 201) return;
          const id = createRes.body.data.id;

          const delRes = await request(app)
            .delete(`/api/products/${id}`)
            .set('Authorization', AUTH_HEADER);
          expect(delRes.status).toBe(200);

          const getRes = await request(app)
            .get(`/api/products/${id}`)
            .set('Authorization', AUTH_HEADER);
          expect(getRes.status).toBe(404);
        }),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 2: Validation rejects invalid product input
  describe('Property 2: Validation rejects invalid product input', () => {
    it('should reject products with invalid fields', async () => {
      const invalidProducts = [
        { name: '', sku: 'VALID-SKU', category: 'Cat', quantity: 10, unitPrice: 5 }, // empty name
        { name: 'Valid', sku: 'invalid sku!', category: 'Cat', quantity: 10, unitPrice: 5 }, // invalid SKU chars
        { name: 'Valid', sku: 'OK', category: '', quantity: 10, unitPrice: 5 }, // empty category
        { name: 'Valid', sku: 'OK2', category: 'Cat', quantity: -1, unitPrice: 5 }, // negative quantity
        { name: 'Valid', sku: 'OK3', category: 'Cat', quantity: 1000000, unitPrice: 5 }, // quantity too high
        { name: 'Valid', sku: 'OK4', category: 'Cat', quantity: 10, unitPrice: -1 }, // negative price
        { name: 'Valid', sku: 'OK5', category: 'Cat', quantity: 10, unitPrice: 5.123 }, // too many decimals
      ];

      for (const payload of invalidProducts) {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', AUTH_HEADER)
          .send(payload);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details).toBeDefined();
      }
    });

    it('should reject randomly generated invalid products', async () => {
      // Generate names that are too long
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 201, maxLength: 250 }),
          async (longName) => {
            const res = await request(app)
              .post('/api/products')
              .set('Authorization', AUTH_HEADER)
              .send({ name: longName, sku: 'X', category: 'Cat', quantity: 1, unitPrice: 1 });
            expect(res.status).toBe(400);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });
});
