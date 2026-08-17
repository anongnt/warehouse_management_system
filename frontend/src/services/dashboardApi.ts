import api from './api';
import {
  DashboardSummary,
  CategoryDistributionItem,
  LowStockProduct,
  RecentProduct,
  ApiResponse,
} from '../types';

const TIMEOUT = 30000;

export async function fetchSummary(): Promise<DashboardSummary> {
  const response = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', {
    timeout: TIMEOUT,
  });
  return response.data.data!;
}

export async function fetchCategoryDistribution(): Promise<CategoryDistributionItem[]> {
  const response = await api.get<ApiResponse<CategoryDistributionItem[]>>('/dashboard/categories', {
    timeout: TIMEOUT,
  });
  return response.data.data!;
}

export async function fetchLowStockProducts(): Promise<LowStockProduct[]> {
  const response = await api.get<ApiResponse<LowStockProduct[]>>('/dashboard/low-stock', {
    timeout: TIMEOUT,
  });
  return response.data.data!;
}

export async function fetchRecentProducts(): Promise<RecentProduct[]> {
  const response = await api.get<ApiResponse<RecentProduct[]>>('/dashboard/recent-products', {
    timeout: TIMEOUT,
  });
  return response.data.data!;
}
