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
  width: number | null;
  height: number | null;
  sortOrder: number;
  categoryId: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  /** Публичный API отдаёт filename; url может вычисляться на клиенте */
  url?: string;
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
