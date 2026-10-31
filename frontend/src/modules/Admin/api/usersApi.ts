import { api } from '@/api/base';
import type { User } from '@/modules/Admin/types';

export interface CreateUserPayload {
  login: string;
  password: string;
  name?: string;
}

export interface UpdateUserPayload {
  login?: string;
  password?: string;
  name?: string;
  role?: User['role'];
}

export const usersApi = {
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUserPayload): Promise<User> {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UpdateUserPayload): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },
};
