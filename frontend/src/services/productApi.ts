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
  const response = await api.post<ApiResponse<Product>>('/products', data);
  return response.data;
}

export async function updateProduct(id: string, data: UpdateProductPayload) {
  const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
  return response.data;
}

export async function deleteProduct(id: string) {
  const response = await api.delete<ApiResponse<undefined>>(`/products/${id}`);
  return response.data;
}
