import { api } from '@/api/base';
import type { User } from '@/modules/Admin/types';

export const authApi = {
  async login(login: string, password: string): Promise<{ user: User }> {
    const response = await api.post<{ user: User }>('/auth/login', { login, password });
    return response.data;
  },

  async logout(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  async refresh(): Promise<{ user: User }> {
    const response = await api.post<{ user: User }>('/auth/refresh');
    return response.data;
  },

  async me(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};