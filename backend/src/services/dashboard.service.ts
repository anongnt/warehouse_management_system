import { getPool } from '../database';
import {
  DashboardSummary,
  CategoryDistributionItem,
  LowStockProduct,
  RecentProduct,
} from '../types';

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const pool = await getPool();

    const result = await pool.request().query<{
      totalProducts: number;
      inventoryValue: number | null;
      totalCategories: number;
      lowStockCount: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'active') as totalProducts,
        (SELECT ROUND(ISNULL(SUM(CAST(quantity AS DECIMAL(18,2)) * unit_price), 0), 2) FROM products WHERE status = 'active') as inventoryValue,
        (SELECT COUNT(*) FROM categories WHERE status = 'active') as totalCategories,
        (SELECT COUNT(*) FROM products WHERE status = 'active' AND quantity <= 10) as lowStockCount`
    );

    const row = result.recordset[0];
    return {
      totalProducts: row.totalProducts,
      inventoryValue: row.inventoryValue ?? 0,
      totalCategories: row.totalCategories,
      lowStockCount: row.lowStockCount,
    };
  }

  async getCategoryDistribution(): Promise<CategoryDistributionItem[]> {
    const pool = await getPool();

    const result = await pool.request().query<CategoryDistributionItem>(
      `SELECT c.name as categoryName, COUNT(p.id) as productCount
       FROM products p
       INNER JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'active' AND c.status = 'active' AND p.category_id IS NOT NULL
       GROUP BY c.name
       ORDER BY COUNT(p.id) DESC, c.name ASC`
    );

    return result.recordset;
  }

  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const pool = await getPool();

    const result = await pool.request().query<LowStockProduct>(
      `SELECT TOP 10 p.name, p.sku, p.quantity, ISNULL(c.name, p.category) as category
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'active' AND p.quantity <= 10
       ORDER BY p.quantity ASC, p.name ASC`
    );

    return result.recordset;
  }

  async getRecentProducts(): Promise<RecentProduct[]> {
    const pool = await getPool();

    const result = await pool.request().query<RecentProduct>(
      `SELECT TOP 5 p.name, p.sku, ISNULL(c.name, p.category) as category,
              p.quantity, p.status, p.created_at as createdAt
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.created_at DESC`
    );

    return result.recordset;
  }
}
