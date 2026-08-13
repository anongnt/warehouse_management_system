import api from './api';
import {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductQueryParams,
  PaginatedProductResponse,
  ApiResponse,
} from '../types';

export async function getProducts(params: ProductQueryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);

  const response = await api.get<ApiResponse<PaginatedProductResponse>>(
    `/products?${queryParams.toString()}`
  );
  return response.data;
}

export async function getProductById(id: string) {
  const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return response.data;
}

export async function createProduct(data: CreateProductPayload) {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.sku) {
    formData.append('sku', data.sku);
  }
  formData.append('category', data.category);
  if (data.categoryId) {
    formData.append('categoryId', data.categoryId);
  }
  formData.append('quantity', String(data.quantity));
  formData.append('unitPrice', String(data.unitPrice));
  if (data.description) {
    formData.append('description', data.description);
  }
  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await api.post<ApiResponse<Product>>('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateProduct(id: string, data: UpdateProductPayload) {
  const formData = new FormData();
  if (data.name !== undefined) formData.append('name', data.name);
  if (data.sku !== undefined) formData.append('sku', data.sku);
  if (data.category !== undefined) formData.append('category', data.category);
  if (data.categoryId !== undefined) formData.append('categoryId', data.categoryId);
  if (data.quantity !== undefined) formData.append('quantity', String(data.quantity));
  if (data.unitPrice !== undefined) formData.append('unitPrice', String(data.unitPrice));
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.status !== undefined) formData.append('status', data.status);
  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await api.put<ApiResponse<Product>>(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateProductStatus(id: string, status: 'active' | 'inactive') {
  const response = await api.patch<ApiResponse<Product>>(`/products/${id}/status`, { status });
  return response.data;
}

export async function deleteProduct(id: string) {
  const response = await api.delete<ApiResponse<undefined>>(`/products/${id}`);
  return response.data;
}

export async function generateSkuPreview(category?: string, categoryId?: string) {
  const response = await api.post<ApiResponse<{ sku: string }>>('/products/generate', { category, categoryId });
  return response.data;
}
