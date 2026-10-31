import { useState, useEffect, useCallback, useRef } from 'react';
import { categoriesApi } from '../api';
import { subscribeAdminRefresh } from '../lib/refresh';
import type { Category, ReorderCategoriesDto } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Снимок актуального списка — для оптимистичной перестановки и отката
  const listRef = useRef<Category[]>([]);

  useEffect(() => {
    listRef.current = categories;
  }, [categories]);

  // silent — не трогать loading: используется для фоновой синхронизации
  // после мутации, которая уже оптимистично обновила список сама (reorder,
  // delete и т.п.) — полный сброс в "загрузка" тут выглядел бы так, будто
  // список на мгновение пропадает и появляется заново.
  const fetchCategories = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const data = await categoriesApi.getCategories();
      setCategories(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки категорий');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Инвалидация после сохранения в редакторе категории — тихая: сам список
  // уже либо обновился оптимистично (reorder/delete), либо это другая
  // страница/компонент и loading-флаг этой страницы трогать не нужно.
  useEffect(
    () => subscribeAdminRefresh(() => { void fetchCategories({ silent: true }); }),
    [fetchCategories]
  );

  const createCategory = async (data: { name: string; slug?: string; description?: string }) => {
    const newCategory = await categoriesApi.createCategory(data);
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.sortOrder - b.sortOrder));
    return newCategory;
  };

  const updateCategory = async (id: string, data: Partial<{ name: string; slug?: string; description?: string }>) => {
    const updated = await categoriesApi.updateCategory(id, data);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteCategory = async (id: string) => {
    await categoriesApi.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const reorderCategories = async (items: ReorderCategoriesDto['items']) => {
    // Сначала переставляем локально, чтобы список перестроился без ожидания сети,
    // затем заменяем ответом сервера; при ошибке возвращаем как было.
    const snapshot = listRef.current;
    const order = new Map(items.map((item) => [item.id, item.sortOrder]));
    setCategories(
      [...snapshot].sort(
        (a, b) => (order.get(a.id) ?? a.sortOrder) - (order.get(b.id) ?? b.sortOrder)
      )
    );

    try {
      const updated = await categoriesApi.reorderCategories({ items });
      setCategories(updated);
      return updated;
    } catch (e) {
      setCategories(snapshot);
      throw e;
    }
  };

  return { categories, loading, error, refetch: fetchCategories, createCategory, updateCategory, deleteCategory, reorderCategories };
}
