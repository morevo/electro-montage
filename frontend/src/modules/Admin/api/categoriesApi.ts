import { api } from '@/api/base';
import type { Category, ReorderCategoriesDto } from '@/modules/Admin/types';

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  async getCategory(id: string): Promise<Category> {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  async createCategory(data: { name: string; slug?: string; description?: string }): Promise<Category> {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: Partial<{ name: string; slug?: string; description?: string }>): Promise<Category> {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/categories/${id}`);
    return response.data;
  },

  async reorderCategories(data: ReorderCategoriesDto): Promise<Category[]> {
    const response = await api.patch<Category[]>('/categories/reorder', data);
    return response.data;
  },
};