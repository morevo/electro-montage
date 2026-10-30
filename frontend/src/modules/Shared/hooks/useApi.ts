import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/modules/Shared/api';

// Query keys
export const queryKeys = {
  categories: {
    all: ['public', 'categories'] as const,
    detail: (slug: string) => ['public', 'categories', slug] as const,
  },
};

// Public categories hooks
export function usePublicCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => publicApi.getCategories(),
  });
}

export function usePublicCategory(slug: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(slug),
    queryFn: () => publicApi.getCategoryBySlug(slug),
    enabled: !!slug,
  });
}
