import { apiClient } from './client';
import { Category, ReorderCategoriesDto } from '../../types';

export const categoriesApi = {
  getAll: () =>
    apiClient.get<Category[]>('/categories'),

  getOne: (id: string) =>
    apiClient.get<Category>(`/categories/${id}`),

  create: (data: { name: string; slug: string; description?: string }) =>
    apiClient.post<Category>('/categories', data),

  update: (id: string, data: Partial<{ name: string; slug: string; description?: string }>) =>
    apiClient.patch<Category>(`/categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/categories/${id}`),

  reorder: (data: ReorderCategoriesDto) =>
    apiClient.patch<Category[]>('/categories/reorder', data),
};