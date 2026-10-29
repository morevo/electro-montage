import { apiClient } from './client';
import { Category } from '../../types';

export const publicApi = {
  getCategories: () =>
    apiClient.get<Category[]>('/public/categories'),

  getCategoryBySlug: (slug: string) =>
    apiClient.get<Category>(`/public/categories/${slug}`),
};