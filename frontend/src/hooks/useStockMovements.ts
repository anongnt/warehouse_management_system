import { useState, useEffect, useCallback } from 'react';
import { getMovements } from '../services/stockApi';
import { StockMovement, MovementType } from '../types/stock.types';

export interface MovementFilterState {
  productId: string;
  movementType: '' | MovementType;
  startDate: string;
  endDate: string;
}

export interface UseStockMovementsReturn {
  movements: StockMovement[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  filters: MovementFilterState;
  loading: boolean;
  error: string | null;
  isStockCardMode: boolean;
  setPage: (page: number) => void;
  setFilter: <K extends keyof MovementFilterState>(key: K, value: MovementFilterState[K]) => void;
  resetFilters: () => void;
  refetch: () => void;
}

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

const EMPTY_FILTERS: MovementFilterState = {
  productId: '',
  movementType: '',
  startDate: '',
  endDate: '',
};

export function useStockMovements(
  initialFilters: Partial<MovementFilterState> = {},
  limit = 20
): UseStockMovementsReturn {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<MovementFilterState>({
    ...EMPTY_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const setFilter = useCallback(
    <K extends keyof MovementFilterState>(key: K, value: MovementFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // The API rejects startDate > endDate; do not even send an impossible range
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      setMovements([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      const response = await getMovements({
        page,
        limit,
        productId: filters.productId || undefined,
        movementType: filters.movementType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      const data = response.data!;
      setMovements(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
      setMovements([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    movements,
    total,
    page,
    totalPages,
    limit,
    filters,
    loading,
    error,
    isStockCardMode: Boolean(filters.productId),
    setPage,
    setFilter,
    resetFilters,
    refetch,
  };
}
