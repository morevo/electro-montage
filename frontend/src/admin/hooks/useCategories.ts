import { useState, useEffect, useCallback } from 'react';
import { categoriesApi } from '../services/api/categories';
import { Category, ReorderCategoriesDto } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll();
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

  const createCategory = async (data: { name: string; slug: string; description?: string }) => {
    const newCategory = await categoriesApi.create(data);
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.sortOrder - b.sortOrder));
    return newCategory;
  };

  const updateCategory = async (id: string, data: Partial<{ name: string; slug: string; description?: string }>) => {
    const updated = await categoriesApi.update(id, data);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteCategory = async (id: string) => {
    await categoriesApi.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const reorderCategories = async (items: ReorderCategoriesDto['items']) => {
    const updated = await categoriesApi.reorder({ items });
    setCategories(updated);
    return updated;
  };

  return { categories, loading, error, refetch: fetchCategories, createCategory, updateCategory, deleteCategory, reorderCategories };
}