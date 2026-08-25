import api from './api';
import { ApiResponse } from '../types';
import {
  StockDocument,
  CancelDocumentResult,
  StockBalanceDetail,
  CreateReceiptPayload,
  CreateIssuePayload,
  CreateAdjustmentPayload,
  CancelDocumentPayload,
  StockBalanceQueryParams,
  StockMovementQueryParams,
  PaginatedStockBalanceResponse,
  PaginatedStockMovementResponse,
} from '../types/stock.types';

export async function createReceipt(data: CreateReceiptPayload) {
  const response = await api.post<ApiResponse<StockDocument>>('/stock/receipts', data);
  return response.data;
}

export async function createIssue(data: CreateIssuePayload) {
  const response = await api.post<ApiResponse<StockDocument>>('/stock/issues', data);
  return response.data;
}

export async function createAdjustment(data: CreateAdjustmentPayload) {
  const response = await api.post<ApiResponse<StockDocument>>('/stock/adjustments', data);
  return response.data;
}

export async function cancelDocument(id: string, data: CancelDocumentPayload) {
  const response = await api.post<ApiResponse<CancelDocumentResult>>(
    `/stock/documents/${id}/cancel`,
    data
  );
  return response.data;
}

export async function getDocument(id: string) {
  const response = await api.get<ApiResponse<StockDocument>>(`/stock/documents/${id}`);
  return response.data;
}

export async function getBalances(params: StockBalanceQueryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.categoryId) queryParams.set('categoryId', params.categoryId);
  if (params.lowStock) queryParams.set('lowStock', 'true');
  if (params.threshold !== undefined) queryParams.set('threshold', String(params.threshold));

  const response = await api.get<ApiResponse<PaginatedStockBalanceResponse>>(
    `/stock/balances?${queryParams.toString()}`
  );
  return response.data;
}

export async function getBalanceByProductId(productId: string) {
  const response = await api.get<ApiResponse<StockBalanceDetail>>(`/stock/balances/${productId}`);
  return response.data;
}

export async function getMovements(params: StockMovementQueryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.productId) queryParams.set('productId', params.productId);
  if (params.movementType) queryParams.set('movementType', params.movementType);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const response = await api.get<ApiResponse<PaginatedStockMovementResponse>>(
    `/stock/movements?${queryParams.toString()}`
  );
  return response.data;
}
