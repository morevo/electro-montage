import { useState, useCallback } from 'react';
import { photosApi } from '../services/api/photos';
import { Photo, PaginatedResponse, ReorderPhotosDto } from '../types';

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchPhotos = useCallback(async (categoryId?: string, page = 1) => {
    try {
      setLoading(true);
      const data: PaginatedResponse<Photo> = await photosApi.getAll(categoryId, page);
      setPhotos(data.data);
      setPagination({ page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = async (categoryId: string, file: File, title: string, description?: string) => {
    const photo = await photosApi.upload(categoryId, file, title, description);
    setPhotos(prev => [photo, ...prev]);
    return photo;
  };

  const updatePhoto = async (id: string, data: Partial<{ title: string; description?: string; categoryId: string }>) => {
    const updated = await photosApi.update(id, data);
    setPhotos(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deletePhoto = async (id: string) => {
    await photosApi.delete(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const reorderPhotos = async (categoryId: string, items: ReorderPhotosDto['items']) => {
    const data = await photosApi.reorder({ categoryId, items });
    setPhotos(data.data);
    return data;
  };

  return { photos, loading, error, pagination, fetchPhotos, uploadPhoto, updatePhoto, deletePhoto, reorderPhotos };
}