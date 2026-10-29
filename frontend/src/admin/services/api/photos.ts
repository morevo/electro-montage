import { apiClient } from './client';
import { Photo, PaginatedResponse, ReorderPhotosDto } from '../../types';

export const photosApi = {
  getAll: (categoryId?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return apiClient.get<PaginatedResponse<Photo>>(`/photos?${params.toString()}`);
  },

  getOne: (id: string) =>
    apiClient.get<Photo>(`/photos/${id}`),

  upload: (categoryId: string, file: File, title: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);
    formData.append('title', title);
    if (description) formData.append('description', description);
    return apiClient.postForm<Photo>('/photos', formData);
  },

  update: (id: string, data: Partial<{ title: string; description?: string; categoryId: string }>) =>
    apiClient.patch<Photo>(`/photos/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/photos/${id}`),

  reorder: (data: ReorderPhotosDto) =>
    apiClient.patch<PaginatedResponse<Photo>>('/photos/reorder', data),
};