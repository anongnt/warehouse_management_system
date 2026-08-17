import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardSummary,
  CategoryDistributionItem,
  LowStockProduct,
  RecentProduct,
} from '../types';
import {
  fetchSummary,
  fetchCategoryDistribution,
  fetchLowStockProducts,
  fetchRecentProducts,
} from '../services/dashboardApi';

export interface UseDashboardReturn {
  summary: DashboardSummary | null;
  categories: CategoryDistributionItem[];
  lowStockProducts: LowStockProduct[];
  recentProducts: RecentProduct[];
  loading: {
    summary: boolean;
    categories: boolean;
    lowStock: boolean;
    recent: boolean;
  };
  errors: {
    summary: string | null;
    categories: string | null;
    lowStock: string | null;
    recent: string | null;
  };
  retry: (section: 'summary' | 'categories' | 'lowStock' | 'recent') => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'Network Error') {
      return 'ไม่สามารถเชื่อมต่อเครือข่ายได้';
    }
    if ((error as any).code === 'ECONNABORTED') {
      return 'หมดเวลาในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
    }
  }
  return 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay);
    }
    throw error;
  }
}

export function useDashboard(): UseDashboardReturn {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<CategoryDistributionItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  const [loading, setLoading] = useState({
    summary: true,
    categories: true,
    lowStock: true,
    recent: true,
  });

  const [errors, setErrors] = useState<{
    summary: string | null;
    categories: string | null;
    lowStock: string | null;
    recent: string | null;
  }>({
    summary: null,
    categories: null,
    lowStock: null,
    recent: null,
  });

  const hasFetched = useRef(false);

  const loadSummary = useCallback(async () => {
    setLoading((prev) => ({ ...prev, summary: true }));
    setErrors((prev) => ({ ...prev, summary: null }));
    try {
      const data = await withRetry(fetchSummary);
      setSummary(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, summary: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, summary: false }));
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading((prev) => ({ ...prev, categories: true }));
    setErrors((prev) => ({ ...prev, categories: null }));
    try {
      const data = await withRetry(fetchCategoryDistribution);
      setCategories(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, categories: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    setLoading((prev) => ({ ...prev, lowStock: true }));
    setErrors((prev) => ({ ...prev, lowStock: null }));
    try {
      const data = await withRetry(fetchLowStockProducts);
      setLowStockProducts(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, lowStock: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, lowStock: false }));
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setLoading((prev) => ({ ...prev, recent: true }));
    setErrors((prev) => ({ ...prev, recent: null }));
    try {
      const data = await withRetry(fetchRecentProducts);
      setRecentProducts(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, recent: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, recent: false }));
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    hasFetched.current = true;

    // Load in 2 batches to avoid overwhelming the DB connection pool
    const loadAll = async () => {
      await Promise.all([loadSummary(), loadCategories()]);
      await Promise.all([loadLowStock(), loadRecent()]);
    };
    loadAll();
  }, [loadSummary, loadCategories, loadLowStock, loadRecent]);

  const retry = useCallback(
    (section: 'summary' | 'categories' | 'lowStock' | 'recent') => {
      switch (section) {
        case 'summary':
          loadSummary();
          break;
        case 'categories':
          loadCategories();
          break;
        case 'lowStock':
          loadLowStock();
          break;
        case 'recent':
          loadRecent();
          break;
      }
    },
    [loadSummary, loadCategories, loadLowStock, loadRecent]
  );

  return {
    summary,
    categories,
    lowStockProducts,
    recentProducts,
    loading,
    errors,
    retry,
  };
}
