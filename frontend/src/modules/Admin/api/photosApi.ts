import { api } from '@/api/base';
import type { Photo, ReorderPhotosDto, PaginatedResponse } from '@/modules/Admin/types';

export const photosApi = {
  async getPhotos(categoryId?: string, page = 1, limit = 20): Promise<PaginatedResponse<Photo>> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const response = await api.get<PaginatedResponse<Photo>>(`/photos?${params.toString()}`);
    return response.data;
  },

  async getPhoto(id: string): Promise<Photo> {
    const response = await api.get<Photo>(`/photos/${id}`);
    return response.data;
  },

  async uploadPhoto(
    categoryId: string,
    file: File,
    title: string,
    description?: string
  ): Promise<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);
    formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await api.post<Photo>('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Пакетная загрузка: названия идут в том же порядке, что и файлы. */
  async uploadPhotos(
    categoryId: string,
    files: File[],
    titles: string[],
    description?: string
  ): Promise<{ created: Photo[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('categoryId', categoryId);
    formData.append('titles', JSON.stringify(titles));
    if (description) formData.append('description', description);

    const response = await api.post<{ created: Photo[] }>('/photos/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhotos(ids: string[]): Promise<{ deleted: number }> {
    const response = await api.post<{ deleted: number }>('/photos/bulk-delete', { ids });
    return response.data;
  },

  async updatePhoto(
    id: string,
    data: Partial<{ title: string; description?: string; categoryId: string }>
  ): Promise<Photo> {
    const response = await api.patch<Photo>(`/photos/${id}`, data);
    return response.data;
  },

  async deletePhoto(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/photos/${id}`);
    return response.data;
  },

  async reorderPhotos(data: ReorderPhotosDto): Promise<PaginatedResponse<Photo>> {
    const response = await api.patch<PaginatedResponse<Photo>>('/photos/reorder', data);
    return response.data;
  },
};