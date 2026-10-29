import { apiClient } from './client';
import { User } from '../../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: User }>('/auth/login', { email, password }),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout', {}),

  refresh: () =>
    apiClient.post<{ user: User }>('/auth/refresh', {}),

  me: () =>
    apiClient.get<User>('/auth/me'),
};