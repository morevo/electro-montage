export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  _count?: {
    photos: number;
  };
  photos?: Photo[];
}

export interface Photo {
  id: string;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  sortOrder: number;
  categoryId: string;
  category?: Category;
  url: string;
  createdAt: string;
}

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