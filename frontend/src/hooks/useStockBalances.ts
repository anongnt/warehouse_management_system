import { useState, useEffect, useCallback, useRef } from 'react';
import { getBalances } from '../services/stockApi';
import { StockBalance, LOW_STOCK_THRESHOLD_DEFAULT } from '../types/stock.types';

export interface UseStockBalancesReturn {
  balances: StockBalance[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  search: string;
  categoryId: string;
  lowStock: boolean;
  threshold: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setCategoryId: (categoryId: string) => void;
  setLowStock: (lowStock: boolean) => void;
  setThreshold: (threshold: number) => void;
  refetch: () => void;
}

// Same error mapping as useDashboard so the whole app speaks with one voice
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const axiosError = error as {
      message?: string;
      code?: string;
      response?: { data?: { error?: { message?: string } } };
    };

    const apiMessage = axiosError.response?.data?.error?.message;
    if (apiMessage) {
      return apiMessage;
    }
    if (axiosError.message === 'Network Error') {
      return 'ไม่สามารถเชื่อมต่อเครือข่ายได้';
    }
    if (axiosError.code === 'ECONNABORTED') {
      return 'หมดเวลาในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
    }
  }
  return 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
}

// Read requests are retried once; write requests never are
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

export function useStockBalances(limit = 20): UseStockBalancesReturn {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [threshold, setThreshold] = useState(LOW_STOCK_THRESHOLD_DEFAULT);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box (300 ms) and go back to the first page
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  // Filter changes always reset pagination
  useEffect(() => {
    setPage(1);
  }, [categoryId, lowStock, threshold]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await withRetry(() =>
        getBalances({
          page,
          limit,
          search: debouncedSearch.trim() || undefined,
          categoryId: categoryId || undefined,
          lowStock: lowStock || undefined,
          threshold: lowStock ? threshold : undefined,
        })
      );

      const data = response.data!;
      setBalances(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
      setBalances([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, categoryId, lowStock, threshold]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    balances,
    total,
    page,
    totalPages,
    limit,
    search,
    categoryId,
    lowStock,
    threshold,
    loading,
    error,
    setPage,
    setSearch,
    setCategoryId,
    setLowStock,
    setThreshold,
    refetch,
  };
}
