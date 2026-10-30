import { useState, useCallback, useEffect, useRef } from 'react';
import { photosApi } from '../api';
import { subscribeAdminRefresh } from '../lib/refresh';
import type { Photo, PaginatedResponse, ReorderPhotosDto } from '../types';

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  // Последний запрос — по нему перезапрашиваем после сохранения в редакторе
  const lastQuery = useRef<{ categoryId?: string; page: number }>({ page: 1 });
  // Снимок списка — для оптимистичной перестановки и откота
  const listRef = useRef<Photo[]>([]);

  useEffect(() => {
    listRef.current = photos;
  }, [photos]);

  const fetchPhotos = useCallback(async (categoryId?: string, page = 1) => {
    lastQuery.current = { categoryId, page };
    try {
      setLoading(true);
      const data: PaginatedResponse<Photo> = await photosApi.getPhotos(categoryId, page);
      setPhotos(data.data);
      setPagination({ page: data.page, limit: data.limit, total: data.total, totalPages: data.totalPages });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  }, []);

  // Инвалидация: редактор фото после сохранения дёргает refreshAdminData(),
  // и список перезапрашивает тот же срез, который сейчас показан.
  useEffect(
    () =>
      subscribeAdminRefresh(() => {
        void fetchPhotos(lastQuery.current.categoryId, lastQuery.current.page);
      }),
    [fetchPhotos]
  );

  const uploadPhoto = async (categoryId: string, file: File, title: string, description?: string) => {
    const photo = await photosApi.uploadPhoto(categoryId, file, title, description);
    setPhotos(prev => [photo, ...prev]);
    return photo;
  };

  const uploadPhotos = async (
    categoryId: string,
    files: File[],
    titles: string[],
    description?: string
  ) => {
    const { created } = await photosApi.uploadPhotos(categoryId, files, titles, description);
    setPhotos(prev => [...created, ...prev]);
    return created;
  };

  const updatePhoto = async (id: string, data: Partial<{ title: string; description?: string; categoryId: string }>) => {
    const updated = await photosApi.updatePhoto(id, data);
    setPhotos(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deletePhoto = async (id: string) => {
    await photosApi.deletePhoto(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const deletePhotos = async (ids: string[]) => {
    const { deleted } = await photosApi.deletePhotos(ids);
    const removed = new Set(ids);
    setPhotos(prev => prev.filter(p => !removed.has(p.id)));
    return deleted;
  };

  const reorderPhotos = async (categoryId: string, items: ReorderPhotosDto['items']) => {
    // Переставляем сразу, до ответа сервера: иначе карточка на мгновение
    // возвращается на старое место и только потом прыгает в новое.
    // Ответ сервера содержит весь список категории (без пагинации), поэтому
    // в состояние его не кладём — берём только новые sortOrder.
    const snapshot = listRef.current;
    const order = new Map(items.map((item) => [item.id, item.sortOrder]));

    setPhotos((prev) =>
      [...prev]
        .map((photo) =>
          order.has(photo.id) ? { ...photo, sortOrder: order.get(photo.id) as number } : photo
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );

    try {
      return await photosApi.reorderPhotos({ categoryId, items });
    } catch (e) {
      setPhotos(snapshot);
      throw e;
    }
  };

  return {
    photos,
    loading,
    error,
    pagination,
    fetchPhotos,
    uploadPhoto,
    uploadPhotos,
    updatePhoto,
    deletePhoto,
    deletePhotos,
    reorderPhotos,
  };
}
