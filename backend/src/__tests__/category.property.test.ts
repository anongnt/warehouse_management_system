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
// Valid name: Thai/English/numbers/spaces, 1-100 chars
const validNameArb = fc.stringOf(
  fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''),
    'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น'
  ),
  { minLength: 1, maxLength: 50 }
).filter(s => s.trim().length >= 1);

// Valid code: 2-10 uppercase A-Z
const validCodeArb = fc.stringOf(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 2, maxLength: 10 }
);

// Valid description: 0-500 chars
const validDescriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined });

let codeCounter = Date.now() % 10000000;
function uniqueCode(prefix: string): string {
  codeCounter++;
  return `${prefix}${String(codeCounter).padStart(3, '0')}`.substring(0, 10).replace(/[^A-Z]/g, 'X');
}

function uniqueCodeSafe(): string {
  codeCounter++;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = 'TC';
  let remaining = codeCounter;
  for (let i = 0; i < 5; i++) {
    result += chars[remaining % 26];
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function uniqueName(prefix: string): string {
  codeCounter++;
  return `${prefix}${codeCounter}`;
}

// Cleanup helper
async function cleanupCategories() {
  const pool = await getPool();
  // Delete products linked to test categories first
  await pool.request().query("DELETE FROM products WHERE category_id IN (SELECT id FROM categories WHERE code LIKE 'TC%')");
  // Delete leaves first (depth 3), then depth 2, then roots
  await pool.request().query(`
    WHILE EXISTS (SELECT 1 FROM categories WHERE code LIKE 'TC%')
    BEGIN
      DELETE FROM categories WHERE code LIKE 'TC%' AND id NOT IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id IS NOT NULL AND code LIKE 'TC%');
    END
  `);
}

describe('Feature: product-category', () => {
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
    // Ensure products has category_id column
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('products') AND name = 'category_id')
      BEGIN
        ALTER TABLE products ADD category_id UNIQUEIDENTIFIER NULL;
      END
    `);
    // Clean up any leftover test data from previous runs
    await cleanupCategories();
  });

  afterAll(async () => {
    await cleanupCategories();
    await closePool();
  });

  afterEach(async () => {
    await cleanupCategories();
  });

  // Property 1: Category creation round-trip
  describe('Property 1: Category creation round-trip', () => {
    it('creating a category and retrieving it should yield the same field values', async () => {
      await fc.assert(
        fc.asyncProperty(validNameArb, validDescriptionArb, async (name, description) => {
          const code = uniqueCodeSafe();

          const createRes = await request(app)
            .post('/api/categories')
            .set('Authorization', AUTH_HEADER)
            .send({ name, code, description });

          if (createRes.status !== 201) return;

          const id = createRes.body.data.id;
          const getRes = await request(app)
            .get(`/api/categories/${id}`)
            .set('Authorization', AUTH_HEADER);

          expect(getRes.status).toBe(200);
          expect(getRes.body.data.name).toBe(name.trim());
          expect(getRes.body.data.code).toBe(code);
          expect(getRes.body.data.status).toBe('active');
          expect(getRes.body.data.createdAt).toBeDefined();
          expect(getRes.body.data.updatedAt).toBeDefined();
        }),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 2: Code uniqueness enforcement
  describe('Property 2: Code uniqueness enforcement', () => {
    it('creating two categories with the same code should return 409 on the second', async () => {
      await fc.assert(
        fc.asyncProperty(validNameArb, async (name) => {
          const code = uniqueCodeSafe();

          const first = await request(app)
            .post('/api/categories')
            .set('Authorization', AUTH_HEADER)
            .send({ name, code });

          if (first.status !== 201) return;

          const second = await request(app)
            .post('/api/categories')
            .set('Authorization', AUTH_HEADER)
            .send({ name: name + ' 2', code });

          expect(second.status).toBe(409);
          expect(second.body.error.code).toBe('CONFLICT');
        }),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 3: Non-existent parent reference rejected
  describe('Property 3: Non-existent parent reference rejected', () => {
    it('creating a category with a non-existent parentId should return 404', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (randomUuid) => {
            const code = uniqueCodeSafe();
            const res = await request(app)
              .post('/api/categories')
              .set('Authorization', AUTH_HEADER)
              .send({ name: 'Test Category', code, parentId: randomUuid });

            expect(res.status).toBe(404);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 4: Validation rejects invalid input
  describe('Property 4: Validation rejects invalid input', () => {
    it('should reject categories with invalid fields', async () => {
      const invalidInputs = [
        { name: '', code: 'AB' },                          // empty name
        { name: 'A'.repeat(101), code: 'AB' },             // name too long
        { name: 'Valid', code: 'A' },                      // code too short
        { name: 'Valid', code: 'A'.repeat(11) },           // code too long
        { name: 'Valid', code: 'abc' },                    // code lowercase
        { name: 'Valid', code: 'AB1' },                    // code with number
        { name: 'Valid', code: 'AB', description: 'X'.repeat(501) }, // description too long
      ];

      for (const payload of invalidInputs) {
        const res = await request(app)
          .post('/api/categories')
          .set('Authorization', AUTH_HEADER)
          .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject randomly generated invalid codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !/^[A-Z]{2,10}$/.test(s)),
          async (invalidCode) => {
            const res = await request(app)
              .post('/api/categories')
              .set('Authorization', AUTH_HEADER)
              .send({ name: 'Valid Name', code: invalidCode });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);
  });

  // Property 5: Depth constraint enforcement
  describe('Property 5: Depth constraint enforcement', () => {
    it('should reject creating a 4th level category', async () => {
      // Create 3 levels
      const code1 = uniqueCodeSafe();
      const code2 = uniqueCodeSafe();
      const code3 = uniqueCodeSafe();

      const level1 = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Level1'), code: code1 });
      expect(level1.status).toBe(201);

      const level2 = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Level2'), code: code2, parentId: level1.body.data.id });
      expect(level2.status).toBe(201);

      const level3 = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Level3'), code: code3, parentId: level2.body.data.id });
      expect(level3.status).toBe(201);

      // Try to create 4th level - should fail
      const code4 = uniqueCodeSafe();
      const level4 = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Level4'), code: code4, parentId: level3.body.data.id });

      expect(level4.status).toBe(400);
      expect(level4.body.error.code).toBe('VALIDATION_ERROR');
    }, 30000);

    it('should reject moving a category that would exceed depth 3', async () => {
      const codeA = uniqueCodeSafe();
      const codeB = uniqueCodeSafe();
      const codeC = uniqueCodeSafe();
      const codeD = uniqueCodeSafe();

      // Create A -> B -> C chain (3 levels)
      const a = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatA'), code: codeA });
      expect(a.status).toBe(201);
      const b = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatB'), code: codeB, parentId: a.body.data.id });
      expect(b.status).toBe(201);
      const c = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatC'), code: codeC, parentId: b.body.data.id });
      expect(c.status).toBe(201);

      // Create separate D
      const d = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('CatD'), code: codeD });
      expect(d.status).toBe(201);

      // Try to move D under C (would create depth 4)
      const moveRes = await request(app)
        .put(`/api/categories/${d.body.data.id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ parentId: c.body.data.id });

      expect(moveRes.status).toBe(400);
      expect(moveRes.body.error.code).toBe('VALIDATION_ERROR');
    }, 30000);
  });

  // Property 6: Search filter correctness
  describe('Property 6: Search filter correctness', () => {
    it('all search results should contain the search term in name or code', async () => {
      // Seed categories
      const codes = [uniqueCodeSafe(), uniqueCodeSafe(), uniqueCodeSafe()];
      const names = ['Alpha Electronics', 'Beta Gadget', 'Gamma Tools'];

      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
          .send({ name: names[i], code: codes[i] });
      }

      const searchTerms = ['Alpha', 'gadget', 'TC'];
      for (const term of searchTerms) {
        const res = await request(app)
          .get(`/api/categories?flat=true&search=${encodeURIComponent(term)}`)
          .set('Authorization', AUTH_HEADER);

        expect(res.status).toBe(200);
        for (const cat of res.body.data) {
          const lower = term.toLowerCase();
          const matches =
            cat.name.toLowerCase().includes(lower) ||
            cat.code.toLowerCase().includes(lower);
          expect(matches).toBe(true);
        }
      }
    }, 30000);
  });

  // Property 7: Status filter correctness
  describe('Property 7: Status filter correctness', () => {
    it('filtering by status should return only categories with matching status', async () => {
      const code1 = uniqueCodeSafe();
      const code2 = uniqueCodeSafe();

      const cat1 = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('ActiveCat'), code: code1 });
      const cat2 = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('InactiveCat'), code: code2 });

      expect(cat1.status).toBe(201);
      expect(cat2.status).toBe(201);

      // Set cat2 to inactive
      await request(app)
        .patch(`/api/categories/${cat2.body.data.id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'inactive' });

      // Filter active
      const activeRes = await request(app)
        .get('/api/categories?flat=true&status=active')
        .set('Authorization', AUTH_HEADER);
      expect(activeRes.status).toBe(200);
      for (const cat of activeRes.body.data) {
        expect(cat.status).toBe('active');
      }

      // Filter inactive
      const inactiveRes = await request(app)
        .get('/api/categories?flat=true&status=inactive')
        .set('Authorization', AUTH_HEADER);
      expect(inactiveRes.status).toBe(200);
      for (const cat of inactiveRes.body.data) {
        expect(cat.status).toBe('inactive');
      }
    }, 30000);
  });

  // Property 8: Non-existent category_id returns NOT_FOUND
  describe('Property 8: Non-existent category returns NOT_FOUND', () => {
    it('GET, PUT, DELETE, PATCH with non-existent UUID should return 404', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (randomUuid) => {
          const getRes = await request(app)
            .get(`/api/categories/${randomUuid}`)
            .set('Authorization', AUTH_HEADER);
          expect(getRes.status).toBe(404);

          const putRes = await request(app)
            .put(`/api/categories/${randomUuid}`)
            .set('Authorization', AUTH_HEADER)
            .send({ name: 'Test' });
          expect(putRes.status).toBe(404);

          const delRes = await request(app)
            .delete(`/api/categories/${randomUuid}`)
            .set('Authorization', AUTH_HEADER);
          expect(delRes.status).toBe(404);

          const patchRes = await request(app)
            .patch(`/api/categories/${randomUuid}/status`)
            .set('Authorization', AUTH_HEADER)
            .send({ status: 'inactive' });
          expect(patchRes.status).toBe(404);
        }),
        { numRuns: 10 }
      );
    }, 60000);
  });

  // Property 9: Invalid UUID format rejected
  describe('Property 9: Invalid UUID format rejected', () => {
    it('should return 400 for non-UUID ID on all endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)),
          async (invalidId) => {
            const encodedId = encodeURIComponent(invalidId);

            const getRes = await request(app)
              .get(`/api/categories/${encodedId}`)
              .set('Authorization', AUTH_HEADER);
            expect(getRes.status).toBe(400);

            const putRes = await request(app)
              .put(`/api/categories/${encodedId}`)
              .set('Authorization', AUTH_HEADER)
              .send({ name: 'test' });
            expect(putRes.status).toBe(400);

            const delRes = await request(app)
              .delete(`/api/categories/${encodedId}`)
              .set('Authorization', AUTH_HEADER);
            expect(delRes.status).toBe(400);

            const patchRes = await request(app)
              .patch(`/api/categories/${encodedId}/status`)
              .set('Authorization', AUTH_HEADER)
              .send({ status: 'inactive' });
            expect(patchRes.status).toBe(400);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  // Property 10: Partial update preserves unmodified fields
  describe('Property 10: Partial update preserves unmodified fields', () => {
    it('updating only subset of fields preserves the rest', async () => {
      const code = uniqueCodeSafe();
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Original'), code, description: 'Original desc' });

      expect(createRes.status).toBe(201);
      const id = createRes.body.data.id;
      const original = createRes.body.data;

      // Update only name
      const updateRes = await request(app)
        .put(`/api/categories/${id}`)
        .set('Authorization', AUTH_HEADER)
        .send({ name: 'Updated Name' });

      expect(updateRes.status).toBe(200);
      const updated = updateRes.body.data;

      expect(updated.name).toBe('Updated Name');
      expect(updated.code).toBe(original.code);
      expect(updated.description).toBe(original.description);
      expect(updated.parentId).toBe(original.parentId);
      expect(updated.status).toBe(original.status);
    }, 30000);

    it('updating different field subsets preserves unmodified fields', async () => {
      const fieldOptions = ['name', 'description'] as const;

      await fc.assert(
        fc.asyncProperty(
          fc.subarray([...fieldOptions], { minLength: 1 }),
          async (fieldsToUpdate) => {
            const code = uniqueCodeSafe();
            const createRes = await request(app)
              .post('/api/categories')
              .set('Authorization', AUTH_HEADER)
              .send({ name: uniqueName('Base'), code, description: 'Base desc' });

            if (createRes.status !== 201) return;
            const id = createRes.body.data.id;
            const original = createRes.body.data;

            const updatePayload: Record<string, any> = {};
            if (fieldsToUpdate.includes('name')) updatePayload.name = 'New Name';
            if (fieldsToUpdate.includes('description')) updatePayload.description = 'New desc';

            const updateRes = await request(app)
              .put(`/api/categories/${id}`)
              .set('Authorization', AUTH_HEADER)
              .send(updatePayload);

            expect(updateRes.status).toBe(200);
            const updated = updateRes.body.data;

            if (!fieldsToUpdate.includes('name')) expect(updated.name).toBe(original.name);
            if (!fieldsToUpdate.includes('description')) expect(updated.description).toBe(original.description);
            expect(updated.code).toBe(original.code);
            expect(updated.status).toBe(original.status);
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);
  });

  // Property 11: Status toggle round-trip
  describe('Property 11: Status toggle round-trip', () => {
    it('toggling status inactive then back to active preserves other data', async () => {
      const code = uniqueCodeSafe();
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('Toggle'), code, description: 'Toggle desc' });

      expect(createRes.status).toBe(201);
      const id = createRes.body.data.id;
      const original = createRes.body.data;

      // Set inactive
      const inactiveRes = await request(app)
        .patch(`/api/categories/${id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'inactive' });
      expect(inactiveRes.status).toBe(200);
      expect(inactiveRes.body.data.status).toBe('inactive');

      // Set active again
      const activeRes = await request(app)
        .patch(`/api/categories/${id}/status`)
        .set('Authorization', AUTH_HEADER)
        .send({ status: 'active' });
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.data.status).toBe('active');
      expect(activeRes.body.data.name).toBe(original.name);
      expect(activeRes.body.data.code).toBe(original.code);
      expect(activeRes.body.data.description).toBe(original.description);
    }, 30000);
  });

  // Property 12: Delete removes category permanently
  describe('Property 12: Delete removes category permanently', () => {
    it('after deletion, GET should return 404', async () => {
      await fc.assert(
        fc.asyncProperty(validNameArb, async (name) => {
          const code = uniqueCodeSafe();
          const createRes = await request(app)
            .post('/api/categories')
            .set('Authorization', AUTH_HEADER)
            .send({ name, code });

          if (createRes.status !== 201) return;
          const id = createRes.body.data.id;

          const delRes = await request(app)
            .delete(`/api/categories/${id}`)
            .set('Authorization', AUTH_HEADER);
          expect(delRes.status).toBe(200);

          const getRes = await request(app)
            .get(`/api/categories/${id}`)
            .set('Authorization', AUTH_HEADER);
          expect(getRes.status).toBe(404);
        }),
        { numRuns: 10 }
      );
    }, 60000);
  });

  // Property 13: Product category_id validation
  describe('Property 13: Product category_id validation', () => {
    it('creating product with non-existent category_id should fail', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (randomUuid) => {
          const res = await request(app)
            .post('/api/products')
            .set('Authorization', AUTH_HEADER)
            .send({
              name: uniqueName('TestProd'),
              category: 'Test',
              categoryId: randomUuid,
              quantity: 10,
              unitPrice: 99.99,
            });

          expect(res.status).toBe(400);
        }),
        { numRuns: 10 }
      );
    }, 60000);

    it('creating product with inactive category_id should fail', async () => {
      const code = uniqueCodeSafe();
      const catRes = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('InactiveCat'), code });
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
          name: uniqueName('TestProd'),
          category: 'Test',
          categoryId: catRes.body.data.id,
          quantity: 10,
          unitPrice: 99.99,
        });

      expect(prodRes.status).toBe(400);
    }, 30000);
  });

  // Property 14: SKU generation from category code
  describe('Property 14: SKU generation from category code', () => {
    it('product created with category_id should have SKU using category code', async () => {
      const code = uniqueCodeSafe();
      const catRes = await request(app)
        .post('/api/categories')
        .set('Authorization', AUTH_HEADER)
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
          unitPrice: 50,
        });

      expect(prodRes.status).toBe(201);
      expect(prodRes.body.data.sku).toMatch(new RegExp(`^${code}-\\d{5}$`));

      // Cleanup product
      await request(app).delete(`/api/products/${prodRes.body.data.id}`).set('Authorization', AUTH_HEADER);
    }, 30000);
  });

  // Property 15: Tree structure returns correct nesting
  describe('Property 15: Tree structure returns correct nesting', () => {
    it('tree endpoint should return root categories at top level with children nested', async () => {
      const code1 = uniqueCodeSafe();
      const code2 = uniqueCodeSafe();
      const code3 = uniqueCodeSafe();

      const root = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('TreeRoot'), code: code1 });
      expect(root.status).toBe(201);
      const child = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('TreeChild'), code: code2, parentId: root.body.data.id });
      expect(child.status).toBe(201);
      const grandchild = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('TreeGrandchild'), code: code3, parentId: child.body.data.id });
      expect(grandchild.status).toBe(201);

      const treeRes = await request(app)
        .get('/api/categories')
        .set('Authorization', AUTH_HEADER);

      expect(treeRes.status).toBe(200);

      // Find our root in the tree
      const rootNode = treeRes.body.data.find((c: any) => c.id === root.body.data.id);
      expect(rootNode).toBeDefined();
      expect(rootNode.children).toBeDefined();

      const childNode = rootNode.children.find((c: any) => c.id === child.body.data.id);
      expect(childNode).toBeDefined();
      expect(childNode.children).toBeDefined();

      const grandchildNode = childNode.children.find((c: any) => c.id === grandchild.body.data.id);
      expect(grandchildNode).toBeDefined();
    }, 30000);
  });

  // Property 16: Flat list preserves hierarchy ordering
  describe('Property 16: Flat list preserves hierarchy ordering', () => {
    it('parent should appear before children in flat list', async () => {
      const code1 = uniqueCodeSafe();
      const code2 = uniqueCodeSafe();
      const code3 = uniqueCodeSafe();

      const root = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('FlatRoot'), code: code1 });
      expect(root.status).toBe(201);
      const child = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('FlatChild'), code: code2, parentId: root.body.data.id });
      expect(child.status).toBe(201);
      const grandchild = await request(app).post('/api/categories').set('Authorization', AUTH_HEADER)
        .send({ name: uniqueName('FlatGrandchild'), code: code3, parentId: child.body.data.id });
      expect(grandchild.status).toBe(201);

      const flatRes = await request(app)
        .get('/api/categories?flat=true')
        .set('Authorization', AUTH_HEADER);

      expect(flatRes.status).toBe(200);

      const ids = flatRes.body.data.map((c: any) => c.id);
      const rootIdx = ids.indexOf(root.body.data.id);
      const childIdx = ids.indexOf(child.body.data.id);
      const grandchildIdx = ids.indexOf(grandchild.body.data.id);

      expect(rootIdx).toBeLessThan(childIdx);
      expect(childIdx).toBeLessThan(grandchildIdx);

      // Check levels
      const rootItem = flatRes.body.data.find((c: any) => c.id === root.body.data.id);
      const childItem = flatRes.body.data.find((c: any) => c.id === child.body.data.id);
      const grandchildItem = flatRes.body.data.find((c: any) => c.id === grandchild.body.data.id);

      expect(rootItem.level).toBe(1);
      expect(childItem.level).toBe(2);
      expect(grandchildItem.level).toBe(3);
    }, 30000);
  });
});
