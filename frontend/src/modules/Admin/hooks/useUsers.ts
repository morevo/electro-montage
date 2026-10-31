import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api';
import type { CreateUserPayload, UpdateUserPayload } from '../api/usersApi';
import type { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersApi.getUsers();
      setUsers(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: CreateUserPayload) => {
    const newUser = await usersApi.createUser(data);
    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  };

  const updateUser = async (id: string, data: UpdateUserPayload) => {
    const updated = await usersApi.updateUser(id, data);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };

  const deleteUser = async (id: string) => {
    await usersApi.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return { users, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser };
}
