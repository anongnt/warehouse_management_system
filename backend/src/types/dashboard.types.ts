export interface DashboardSummary {
  totalProducts: number;
  inventoryValue: number;
  totalCategories: number;
  lowStockCount: number;
}

export interface CategoryDistributionItem {
  categoryName: string;
  productCount: number;
}

export interface LowStockProduct {
  name: string;
  sku: string;
  quantity: number;
  category: string;
}

export interface RecentProduct {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  status: 'active' | 'inactive';
  createdAt: string;
}
