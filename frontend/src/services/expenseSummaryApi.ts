import api from './api';
import { ExpenseSummaryApiResponse, ExpenseSummaryData } from '../types/expense-summary.types';

export interface ExpenseSummaryParams {
  startDate: string;
  endDate: string;
  categories?: string[];
  format: 'json' | 'pdf' | 'xlsx';
}

// ดึงข้อมูลสรุปค่าใช้จ่าย (format=json)
export async function fetchExpenseSummary(params: Omit<ExpenseSummaryParams, 'format'>): Promise<ExpenseSummaryData> {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  queryParams.set('format', 'json');
  if (params.categories && params.categories.length > 0) {
    queryParams.set('categories', params.categories.join(','));
  }

  const response = await api.get<ExpenseSummaryApiResponse>(
    `/reports/expense-summary?${queryParams.toString()}`,
    { timeout: 5000 }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
  }

  return response.data.data;
}

// ส่งออกรายงาน (format=pdf|xlsx)
export async function exportExpenseSummary(params: ExpenseSummaryParams, signal?: AbortSignal): Promise<void> {
  const queryParams = new URLSearchParams();
  queryParams.set('startDate', params.startDate);
  queryParams.set('endDate', params.endDate);
  queryParams.set('format', params.format);
  if (params.categories && params.categories.length > 0) {
    queryParams.set('categories', params.categories.join(','));
  }

  const response = await api.get(`/reports/expense-summary?${queryParams.toString()}`, {
    responseType: 'blob',
    timeout: 30000,
    signal,
  });

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers['content-disposition'];
  let filename = `expense-summary.${params.format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  // Trigger browser download
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
