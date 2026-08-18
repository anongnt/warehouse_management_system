import { useState, useEffect, useCallback, useRef } from 'react';
import { ExpenseSummaryData, ExpenseSummaryFilters } from '../types/expense-summary.types';
import { fetchExpenseSummary, exportExpenseSummary } from '../services/expenseSummaryApi';

export interface UseExpenseSummaryReturn {
  data: ExpenseSummaryData | null;
  loading: boolean;
  error: string | null;
  exporting: boolean;
  filters: ExpenseSummaryFilters;
  setDateRange: (start: string, end: string) => void;
  setCategories: (categories: string[]) => void;
  fetchData: () => Promise<void>;
  exportPdf: () => Promise<void>;
  exportExcel: () => Promise<void>;
}

// Helper: ค่าเริ่มต้น date range = เดือนปัจจุบัน
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'Network Error') {
      return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
    }
    if ((error as any).code === 'ECONNABORTED') {
      return 'การโหลดข้อมูลใช้เวลาเกินกำหนด กรุณาลองใหม่';
    }
    if ((error as any).response?.status === 504) {
      return 'การสร้างรายงานใช้เวลาเกินกำหนด กรุณาลองใหม่';
    }
    if ((error as any).response?.status === 500) {
      return 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่';
    }
    return error.message;
  }
  return 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
}

export function useExpenseSummary(): UseExpenseSummaryReturn {
  const defaultRange = getDefaultDateRange();

  const [data, setData] = useState<ExpenseSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<ExpenseSummaryFilters>({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    categories: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // ยกเลิก request ที่ค้างอยู่
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchExpenseSummary({
        startDate: filters.startDate,
        endDate: filters.endDate,
        categories: filters.categories,
      });
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return; // ถูกยกเลิก ไม่ต้องอัพเดต state
      }
      if (!controller.signal.aborted) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Fetch data เมื่อ filters เปลี่ยน
  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const setDateRange = useCallback((start: string, end: string) => {
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const setCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({
      ...prev,
      categories: categories.length > 0 ? categories : undefined,
    }));
  }, []);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      await exportExpenseSummary({
        startDate: filters.startDate,
        endDate: filters.endDate,
        categories: filters.categories,
        format: 'pdf',
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      await exportExpenseSummary({
        startDate: filters.startDate,
        endDate: filters.endDate,
        categories: filters.categories,
        format: 'xlsx',
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [filters]);

  return {
    data,
    loading,
    error,
    exporting,
    filters,
    setDateRange,
    setCategories,
    fetchData,
    exportPdf,
    exportExcel,
  };
}
