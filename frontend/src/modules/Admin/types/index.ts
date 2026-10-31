export type UserRole = 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  login: string;
  name?: string;
  role: UserRole;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  photos?: Photo[];
  _count?: { photos: number };
}

export interface Photo {
  id: string;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  categoryId: string;
  category?: Category;
  /** Бэкенд не всегда возвращает url — можно собрать из filename */
  url?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Бэкенд отдаёт пагинацию плоским объектом:
 * { data, total, page, limit, totalPages }
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

export interface ReorderCategoriesDto {
  items: ReorderItem[];
}

export interface ReorderPhotosDto {
  categoryId: string;
  items: ReorderItem[];
}
