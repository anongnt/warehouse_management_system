import { getPool, sql } from '../database';
import {
  IProductService,
  ProductModel,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductResponse,
  PaginatedResponse,
} from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';

export class ProductService implements IProductService {
  // Find all products with pagination and search
  async findAll(query: ProductQueryDto): Promise<PaginatedResponse<ProductResponse>> {
    const pool = await getPool();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = '';
    const request = pool.request();

    if (query.search && query.search.trim()) {
      whereClause = `WHERE (
        name LIKE @search OR
        sku LIKE @search OR
        category LIKE @search
      )`;
      request.input('search', sql.NVarChar, `%${query.search.trim()}%`);
    }

    // Get total count
    const countResult = await request.query<{ total: number }>(
      `SELECT COUNT(*) as total FROM products ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    // Get paginated data
    const dataRequest = pool.request();
    if (query.search && query.search.trim()) {
      dataRequest.input('search', sql.NVarChar, `%${query.search.trim()}%`);
    }
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const dataResult = await dataRequest.query<ProductModel>(
      `SELECT id, name, sku, category, quantity, unit_price, description, status, created_at, updated_at
       FROM products ${whereClause}
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
    );

    const products = dataResult.recordset.map(p => this.toProductResponse(p));

    return {
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Find product by ID
  async findById(id: string): Promise<ProductResponse | null> {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<ProductModel>(
        `SELECT id, name, sku, category, quantity, unit_price, description, status, created_at, updated_at
         FROM products WHERE id = @id`
      );

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toProductResponse(result.recordset[0]);
  }

  // Create product
  async create(data: CreateProductDto): Promise<ProductResponse> {
    const pool = await getPool();

    // Check SKU uniqueness
    const skuCheck = await pool.request()
      .input('sku', sql.NVarChar, data.sku)
      .query('SELECT id FROM products WHERE sku = @sku');

    if (skuCheck.recordset.length > 0) {
      throw new ConflictError('SKU นี้มีอยู่ในระบบแล้ว');
    }

    const result = await pool.request()
      .input('name', sql.NVarChar, data.name)
      .input('sku', sql.NVarChar, data.sku)
      .input('category', sql.NVarChar, data.category)
      .input('quantity', sql.Int, data.quantity)
      .input('unit_price', sql.Decimal(12, 2), data.unitPrice)
      .input('description', sql.NVarChar, data.description || null)
      .query<ProductModel>(
        `INSERT INTO products (name, sku, category, quantity, unit_price, description, status, created_at, updated_at)
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.sku, INSERTED.category, INSERTED.quantity,
                INSERTED.unit_price, INSERTED.description, INSERTED.status, INSERTED.created_at, INSERTED.updated_at
         VALUES (@name, @sku, @category, @quantity, @unit_price, @description, 'active', GETUTCDATE(), GETUTCDATE())`
      );

    return this.toProductResponse(result.recordset[0]);
  }

  // Update product (partial)
  async update(id: string, data: UpdateProductDto): Promise<ProductResponse> {
    const pool = await getPool();

    // Check product exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query<ProductModel>('SELECT * FROM products WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบสินค้า');
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku) {
      const skuCheck = await pool.request()
        .input('sku', sql.NVarChar, data.sku)
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT id FROM products WHERE sku = @sku AND id != @id');

      if (skuCheck.recordset.length > 0) {
        throw new ConflictError('SKU นี้มีอยู่ในระบบแล้ว');
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
    if (data.sku !== undefined) {
      updates.push('sku = @sku');
      request.input('sku', sql.NVarChar, data.sku);
    }
    if (data.category !== undefined) {
      updates.push('category = @category');
      request.input('category', sql.NVarChar, data.category);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = @quantity');
      request.input('quantity', sql.Int, data.quantity);
    }
    if (data.unitPrice !== undefined) {
      updates.push('unit_price = @unit_price');
      request.input('unit_price', sql.Decimal(12, 2), data.unitPrice);
    }
    if (data.description !== undefined) {
      updates.push('description = @description');
      request.input('description', sql.NVarChar, data.description || null);
    }
    if (data.status !== undefined) {
      updates.push('status = @status');
      request.input('status', sql.NVarChar, data.status);
    }

    if (updates.length === 0) {
      return this.toProductResponse(existing.recordset[0]);
    }

    updates.push('updated_at = GETUTCDATE()');

    const result = await request.query<ProductModel>(
      `UPDATE products SET ${updates.join(', ')}
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.sku, INSERTED.category, INSERTED.quantity,
              INSERTED.unit_price, INSERTED.description, INSERTED.status, INSERTED.created_at, INSERTED.updated_at
       WHERE id = @id`
    );

    return this.toProductResponse(result.recordset[0]);
  }

  // Delete product (permanent)
  async delete(id: string): Promise<void> {
    const pool = await getPool();

    // Check product exists
    const existing = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id FROM products WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new NotFoundError('ไม่พบสินค้า');
    }

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM products WHERE id = @id');
  }

  // Private: Convert DB model to response
  private toProductResponse(product: ProductModel): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: product.quantity,
      unitPrice: Number(product.unit_price),
      description: product.description,
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }
}
