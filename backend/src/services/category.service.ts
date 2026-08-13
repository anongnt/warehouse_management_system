import { getPool, sql } from '../database';
import {
  ICategoryService,
  CategoryModel,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryResponse,
  CategoryTreeResponse,
  CategoryFlatResponse,
  CategoryDetailResponse,
} from '../types';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

export class CategoryService implements ICategoryService {
  // Find all categories (tree or flat)
  async findAll(query: CategoryQueryDto): Promise<CategoryTreeResponse[] | CategoryFlatResponse[]> {
    const pool = await getPool();
    const request = pool.request();

    let whereConditions: string[] = [];

    if (query.search && query.search.trim()) {
      whereConditions.push('(name LIKE @search OR code LIKE @search)');
      request.input('search', sql.NVarChar, `%${query.search.trim()}%`);
    }

    if (query.status) {
      whereConditions.push('status = @status');
      request.input('status', sql.NVarChar, query.status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await request.query<CategoryModel>(
      `SELECT id, name, code, description, parent_id, status, created_at, updated_at
       FROM categories ${whereClause}
       ORDER BY name ASC`
    );

    const categories = result.recordset;

    if (query.flat) {
      return this.buildFlatList(categories);
    }

    return this.buildTree(categories);
  }

  // Find category by ID with detail
  async findById(id: string): Promise<CategoryDetailResponse> {
    const pool = await getPool();

    // Get the category
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<CategoryModel>(
        `SELECT id, name, code, description, parent_id, status, created_at, updated_at
         FROM categories WHERE id = @id`
      );

    if (result.recordset.length === 0) {
      throw new NotFoundError('ไม่พบหมวดหมู่');
    }

    const category = result.recordset[0];

    // Get parent
    let parent: CategoryResponse | null = null;
    if (category.parent_id) {
      const parentResult = await pool.request()
        .input('parentId', sql.UniqueIdentifier, category.parent_id)
        .query<CategoryModel>(
          `SELECT id, name, code, description, parent_id, status, created_at, updated_at
           FROM categories WHERE id = @parentId`
        );
      if (parentResult.recordset.length > 0) {
        parent = this.toCategoryResponse(parentResult.recordset[0]);
      }
    }

    // Get children (1 level)
    const childrenResult = await pool.request()
      .input('parentId', sql.UniqueIdentifier, id)
      .query<CategoryModel>(
        `SELECT id, name, code, description, parent_id, status, created_at, updated_at
         FROM categories WHERE parent_id = @parentId
         ORDER BY name ASC`
      );

    const children = childrenResult.recordset.map(c => this.toCategoryResponse(c));

    // Get product count
    const countResult = await pool.request()
      .input('categoryId', sql.UniqueIdentifier, id)
      .query<{ count: number }>(
        `SELECT COUNT(*) as count FROM products WHERE category_id = @categoryId`
      );

    const productCount = countResult.recordset[0].count;

    return {
      ...this.toCategoryResponse(category),
      parent,
      children,
      productCount,
    };
  }

  // Create category
  async create(data: CreateCategoryDto): Promise<CategoryResponse> {
    const pool = await getPool();

    // Check code uniqueness
    const codeCheck = await pool.request()
      .input('code', sql.NVarChar, data.code)
      .query('SELECT id FROM categories WHERE code = @code');

    if (codeCheck.recordset.length > 0) {
      throw new ConflictError('รหัสหมวดหมู่นี้มีอยู่ในระบบแล้ว');
    }

    // Check parent exists if provided
    if (data.parentId) {
      const parentCheck = await pool.request()
        .input('parentId', sql.UniqueIdentifier, data.parentId)
        .query('SELECT id FROM categories WHERE id = @parentId');

      if (parentCheck.recordset.length === 0) {
        throw new NotFoundError('ไม่พบหมวดหมู่หลักที่ระบุ');
      }

      // Check depth constraint (max 3 levels)
      const parentDepth = await this.getCategoryDepth(data.parentId);
      if (parentDepth >= 3) {
        throw new ValidationError('ไม่สามารถสร้างหมวดหมู่ย่อยได้ เนื่องจากเกินระดับความลึกสูงสุด (3 ระดับ)');
      }
    }

    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('code', sql.NVarChar, data.code)
      .input('description', sql.NVarChar, data.description || null)
      .input('parent_id', sql.UniqueIdentifier, data.parentId || null)
      .query<CategoryModel>(
        `INSERT INTO categories (name, code, description, parent_id, status, created_at, updated_at)
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.code, INSERTED.description, INSERTED.parent_id,
                INSERTED.status, INSERTED.created_at, INSERTED.updated_at
         VALUES (@name, @code, @description, @parent_id, 'active', GETUTCDATE(), GETUTCDATE())`
      );

    return this.toCategoryResponse(result.recordset[0]);
  }

  // Update category
  async update(id: string, data: UpdateCategoryDto): Promise<CategoryResponse> {
    const pool = await getPool();

    // Check exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<CategoryModel>('SELECT * FROM categories WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบหมวดหมู่');
    }

    // Check code uniqueness if updating code
    if (data.code) {
      const codeCheck = await pool.request()
        .input('code', sql.NVarChar, data.code)
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT id FROM categories WHERE code = @code AND id != @id');

      if (codeCheck.recordset.length > 0) {
        throw new ConflictError('รหัสหมวดหมู่นี้มีอยู่ในระบบแล้ว');
      }
    }

    // Check parent change
    if (data.parentId !== undefined) {
      const newParentId = data.parentId;

      if (newParentId !== null) {
        // Check parent exists
        const parentCheck = await pool.request()
          .input('parentId', sql.UniqueIdentifier, newParentId)
          .query('SELECT id FROM categories WHERE id = @parentId');

        if (parentCheck.recordset.length === 0) {
          throw new NotFoundError('ไม่พบหมวดหมู่หลักที่ระบุ');
        }

        // Check circular reference (cannot move under self or descendants)
        if (newParentId === id) {
          throw new ValidationError('ไม่สามารถตั้งหมวดหมู่เป็น parent ของตัวเองได้');
        }

        const isDescendant = await this.isDescendant(newParentId, id);
        if (isDescendant) {
          throw new ValidationError('ไม่สามารถย้ายหมวดหมู่ไปใต้หมวดหมู่ย่อยของตัวเองได้ (circular reference)');
        }

        // Check depth constraint after move
        const newParentDepth = await this.getCategoryDepth(newParentId);
        const maxChildDepth = await this.getMaxChildDepth(id);
        const totalDepth = newParentDepth + 1 + maxChildDepth;

        if (totalDepth > 3) {
          throw new ValidationError('ไม่สามารถย้ายหมวดหมู่ได้ เนื่องจากจะเกินระดับความลึกสูงสุด (3 ระดับ)');
        }
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const request = pool.request();
    request.input('id', sql.UniqueIdentifier, id);

    if (data.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, data.name);
    }
    if (data.code !== undefined) {
      updates.push('code = @code');
      request.input('code', sql.NVarChar, data.code);
    }
    if (data.description !== undefined) {
      updates.push('description = @description');
      request.input('description', sql.NVarChar, data.description || null);
    }
    if (data.parentId !== undefined) {
      updates.push('parent_id = @parent_id');
      request.input('parent_id', sql.UniqueIdentifier, data.parentId || null);
    }

    if (updates.length === 0) {
      return this.toCategoryResponse(existing.recordset[0]);
    }

    updates.push('updated_at = GETUTCDATE()');

    const result = await request.query<CategoryModel>(
      `UPDATE categories SET ${updates.join(', ')}
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.code, INSERTED.description, INSERTED.parent_id,
              INSERTED.status, INSERTED.created_at, INSERTED.updated_at
       WHERE id = @id`
    );

    return this.toCategoryResponse(result.recordset[0]);
  }

  // Update status only
  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<CategoryResponse> {
    const pool = await getPool();

    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id FROM categories WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบหมวดหมู่');
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .query<CategoryModel>(
        `UPDATE categories SET status = @status, updated_at = GETUTCDATE()
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.code, INSERTED.description, INSERTED.parent_id,
                INSERTED.status, INSERTED.created_at, INSERTED.updated_at
         WHERE id = @id`
      );

    return this.toCategoryResponse(result.recordset[0]);
  }

  // Delete category (hard delete)
  async delete(id: string): Promise<void> {
    const pool = await getPool();

    // Check exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id FROM categories WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบหมวดหมู่');
    }

    // Check no subcategories
    const childCheck = await pool.request()
      .input('parentId', sql.UniqueIdentifier, id)
      .query('SELECT COUNT(*) as count FROM categories WHERE parent_id = @parentId');

    if (childCheck.recordset[0].count > 0) {
      throw new ConflictError('ไม่สามารถลบหมวดหมู่ที่มีหมวดหมู่ย่อยได้ กรุณาลบหมวดหมู่ย่อยก่อน');
    }

    // Check no products linked
    const productCheck = await pool.request()
      .input('categoryId', sql.UniqueIdentifier, id)
      .query('SELECT COUNT(*) as count FROM products WHERE category_id = @categoryId');

    if (productCheck.recordset[0].count > 0) {
      throw new ConflictError('ไม่สามารถลบหมวดหมู่ที่มีสินค้าผูกอยู่ได้ กรุณาย้ายสินค้าก่อน');
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM categories WHERE id = @id');
  }

  // Private: Get depth of a category (1 = root, 2 = child of root, etc.)
  private async getCategoryDepth(categoryId: string): Promise<number> {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, categoryId)
      .query<{ depth: number }>(`
        WITH CategoryCTE AS (
          SELECT id, parent_id, 1 as depth
          FROM categories
          WHERE id = @id
          UNION ALL
          SELECT c.id, c.parent_id, cte.depth + 1
          FROM categories c
          INNER JOIN CategoryCTE cte ON c.id = cte.parent_id
        )
        SELECT MAX(depth) as depth FROM CategoryCTE
      `);

    return result.recordset[0]?.depth || 0;
  }

  // Private: Get max depth of children below a category (0 = no children)
  private async getMaxChildDepth(categoryId: string): Promise<number> {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, categoryId)
      .query<{ depth: number }>(`
        WITH ChildCTE AS (
          SELECT id, parent_id, 0 as depth
          FROM categories
          WHERE id = @id
          UNION ALL
          SELECT c.id, c.parent_id, cte.depth + 1
          FROM categories c
          INNER JOIN ChildCTE cte ON c.parent_id = cte.id
        )
        SELECT ISNULL(MAX(depth), 0) as depth FROM ChildCTE WHERE id != @id
      `);

    return result.recordset[0]?.depth || 0;
  }

  // Private: Check if targetId is a descendant of ancestorId
  private async isDescendant(targetId: string, ancestorId: string): Promise<boolean> {
    const pool = await getPool();

    const result = await pool.request()
      .input('ancestorId', sql.UniqueIdentifier, ancestorId)
      .input('targetId', sql.UniqueIdentifier, targetId)
      .query<{ found: number }>(`
        WITH DescendantCTE AS (
          SELECT id
          FROM categories
          WHERE parent_id = @ancestorId
          UNION ALL
          SELECT c.id
          FROM categories c
          INNER JOIN DescendantCTE d ON c.parent_id = d.id
        )
        SELECT CASE WHEN EXISTS (SELECT 1 FROM DescendantCTE WHERE id = @targetId) THEN 1 ELSE 0 END as found
      `);

    return result.recordset[0]?.found === 1;
  }

  // Private: Build tree structure from flat list
  private buildTree(categories: CategoryModel[]): CategoryTreeResponse[] {
    const map = new Map<string, CategoryTreeResponse>();
    const roots: CategoryTreeResponse[] = [];

    // Create response objects with empty children
    for (const cat of categories) {
      map.set(cat.id, {
        ...this.toCategoryResponse(cat),
        children: [],
      });
    }

    // Build parent-child relationships
    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // Private: Build flat list with level info (parent always before children)
  private buildFlatList(categories: CategoryModel[]): CategoryFlatResponse[] {
    const tree = this.buildTree(categories);
    const result: CategoryFlatResponse[] = [];

    const flatten = (nodes: CategoryTreeResponse[], level: number) => {
      for (const node of nodes) {
        const { children, ...rest } = node;
        result.push({ ...rest, level });
        flatten(children, level + 1);
      }
    };

    flatten(tree, 1);
    return result;
  }

  // Private: Convert DB model to response
  private toCategoryResponse(category: CategoryModel): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      parentId: category.parent_id,
      status: category.status,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  }
}
