import {
  Category,
  Photo,
  PaginatedResponse,
  ReorderCategoriesDto,
  ReorderPhotosDto,
  User,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async refresh(): Promise<{ user: User }> {
    return this.request('/auth/refresh', { method: 'POST' });
  }

  async me(): Promise<User> {
    return this.request('/auth/me');
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.request('/categories');
  }

  async getCategory(id: string): Promise<Category> {
    return this.request(`/categories/${id}`);
  }

  async createCategory(data: { name: string; slug: string; description?: string }): Promise<Category> {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<{ name: string; slug: string; description?: string }>): Promise<Category> {
    return this.request(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<{ message: string }> {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  async reorderCategories(data: ReorderCategoriesDto): Promise<Category[]> {
    return this.request('/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Photos
  async getPhotos(categoryId?: string, page = 1, limit = 20): Promise<PaginatedResponse<Photo>> {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return this.request(`/photos?${params.toString()}`);
  }

  async getPhoto(id: string): Promise<Photo> {
    return this.request(`/photos/${id}`);
  }

  async uploadPhoto(categoryId: string, file: File, title: string, description?: string): Promise<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);
    formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await fetch(`${API_BASE}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Ошибка загрузки' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async updatePhoto(id: string, data: Partial<{ title: string; description?: string; categoryId: string }>): Promise<Photo> {
    return this.request(`/photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePhoto(id: string): Promise<{ message: string }> {
    return this.request(`/photos/${id}`, { method: 'DELETE' });
  }

  async reorderPhotos(data: ReorderPhotosDto): Promise<PaginatedResponse<Photo>> {
    return this.request('/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Public API
  async getPublicCategories(): Promise<Category[]> {
    return this.request('/public/categories');
  }

  async getPublicCategory(slug: string): Promise<Category> {
    return this.request(`/public/categories/${slug}`);
  }
}

export const api = new ApiService();