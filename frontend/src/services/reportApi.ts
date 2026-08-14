import api from './api';

export type ReportType = 'inventory' | 'category' | 'low-stock' | 'stock-value';
export type ReportFormat = 'pdf' | 'xlsx';

export interface ReportParams {
  format: ReportFormat;
  category?: string;
  status?: 'active' | 'inactive';
  threshold?: number;
}

// Download report as file
async function downloadReport(reportType: ReportType, params: ReportParams): Promise<void> {
  const queryParams = new URLSearchParams();
  queryParams.set('format', params.format);
  if (params.category) queryParams.set('category', params.category);
  if (params.status) queryParams.set('status', params.status);
  if (params.threshold !== undefined) queryParams.set('threshold', String(params.threshold));

  const response = await api.get(`/reports/${reportType}?${queryParams.toString()}`, {
    responseType: 'blob',
    timeout: 30000,
  });

  // Extract filename from Content-Disposition header or build one
  const contentDisposition = response.headers['content-disposition'];
  let filename = `${reportType}_report.${params.format}`;
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

export async function downloadInventoryReport(params: Omit<ReportParams, 'threshold'>): Promise<void> {
  return downloadReport('inventory', params);
}

export async function downloadCategoryReport(params: Pick<ReportParams, 'format' | 'category'>): Promise<void> {
  return downloadReport('category', params);
}

export async function downloadLowStockReport(params: Pick<ReportParams, 'format' | 'threshold'>): Promise<void> {
  return downloadReport('low-stock', params);
}

export async function downloadStockValueReport(params: Omit<ReportParams, 'threshold'>): Promise<void> {
  return downloadReport('stock-value', params);
}
