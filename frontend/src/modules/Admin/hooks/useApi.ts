import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, categoriesApi, photosApi } from '@/modules/Admin/api';
import type { Category, Photo, PaginatedResponse, ReorderCategoriesDto, ReorderPhotosDto } from '@/modules/Admin/types';

// Query keys
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  categories: {
    all: ['admin', 'categories'] as const,
    detail: (id: string) => ['admin', 'categories', id] as const,
  },
  photos: {
    all: (categoryId?: string, page = 1, limit = 20) =>
      ['admin', 'photos', categoryId, page, limit] as const,
    detail: (id: string) => ['admin', 'photos', id] as const,
  },
};

// Auth hooks
export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ login, password }: { login: string; password: string }) =>
      authApi.login(login, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoriesApi.getCategories(),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesApi.getCategory(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      categoriesApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ name: string; slug: string; description?: string }>;
    }) => categoriesApi.updateCategory(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(id) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderCategoriesDto) => categoriesApi.reorderCategories(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

// Photos hooks
export function usePhotos(categoryId?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.photos.all(categoryId, page, limit),
    queryFn: () => photosApi.getPhotos(categoryId, page, limit),
  });
}

export function usePhoto(id: string) {
  return useQuery({
    queryKey: queryKeys.photos.detail(id),
    queryFn: () => photosApi.getPhoto(id),
    enabled: !!id,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      file,
      title,
      description,
    }: {
      categoryId: string;
      file: File;
      title: string;
      description?: string;
    }) => photosApi.uploadPhoto(categoryId, file, title, description),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.photos.all(categoryId),
      });
    },
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ title: string; description?: string; categoryId: string }>;
    }) => photosApi.updatePhoto(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(id) });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => photosApi.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all() });
    },
  });
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderPhotosDto) => photosApi.reorderPhotos(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all() });
    },
  });
}