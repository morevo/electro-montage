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

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getCategories();
      setCategories(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Инвалидация после сохранения в редакторе категории
  useEffect(() => subscribeAdminRefresh(() => { void fetchCategories(); }), [fetchCategories]);

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
