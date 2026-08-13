import api from './api';
import {
  Category,
  CategoryTree,
  CategoryFlat,
  CategoryDetail,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryQueryParams,
  ApiResponse,
} from '../types';

export async function getCategories(params: CategoryQueryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.flat) queryParams.set('flat', 'true');
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);

  const response = await api.get<ApiResponse<CategoryTree[] | CategoryFlat[]>>(
    `/categories?${queryParams.toString()}`
  );
  return response.data;
}

export async function getCategoriesFlat(params: Omit<CategoryQueryParams, 'flat'> = {}) {
  const queryParams = new URLSearchParams();
  queryParams.set('flat', 'true');
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);

  const response = await api.get<ApiResponse<CategoryFlat[]>>(
    `/categories?${queryParams.toString()}`
  );
  return response.data;
}

export async function getCategoryById(id: string) {
  const response = await api.get<ApiResponse<CategoryDetail>>(`/categories/${id}`);
  return response.data;
}

export async function createCategory(data: CreateCategoryPayload) {
  const response = await api.post<ApiResponse<Category>>('/categories', data);
  return response.data;
}

export async function updateCategory(id: string, data: UpdateCategoryPayload) {
  const response = await api.put<ApiResponse<Category>>(`/categories/${id}`, data);
  return response.data;
}

export async function updateCategoryStatus(id: string, status: 'active' | 'inactive') {
  const response = await api.patch<ApiResponse<Category>>(`/categories/${id}/status`, { status });
  return response.data;
}

export async function deleteCategory(id: string) {
  const response = await api.delete<ApiResponse<undefined>>(`/categories/${id}`);
  return response.data;
}
