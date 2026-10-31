'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Модульный синглтон, а не useState внутри компонента: refreshAdminData()
 * (lib/refresh.ts) вызывается из обработчиков сохранения в админке — это
 * обычные функции вне React-дерева, им нужен queryClient без контекста.
 * Публичный сайт и админка живут в одном SPA с одним QueryClient, поэтому
 * invalidateQueries() из админки сразу обновляет публичные списки, если
 * они открыты в этой же вкладке.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
