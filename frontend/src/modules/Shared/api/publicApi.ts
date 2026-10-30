import { api } from '@/api/base';
import type { Category } from '@/modules/Shared/types';

export const publicApi = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/public/categories');
    return response.data;
  },

  async getCategoryBySlug(slug: string): Promise<Category> {
    const response = await api.get<Category>(`/public/categories/${slug}`);
    return response.data;
  },
};
