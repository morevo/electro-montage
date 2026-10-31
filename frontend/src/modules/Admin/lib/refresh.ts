import { queryClient } from '@/providers/QueryProvider';
import { queryKeys as publicQueryKeys } from '@/modules/Shared/hooks/useApi';

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Админские списки держат данные в локальном состоянии хуков, а редакторы
 * сохраняют через API напрямую. Чтобы после сохранения/удаления список не
 * показывал устаревшие данные, редакторы дёргают refreshAdminData(), а
 * useCategories/usePhotos перезапрашивают свои данные.
 *
 * Публичный сайт (Portfolio) берёт те же категории с фото через TanStack
 * Query — invalidateQueries() здесь заставляет его перезапросить список
 * сразу, без ручного обновления страницы, если он открыт в этой же вкладке.
 */
export function refreshAdminData(): void {
  listeners.forEach((listener) => listener());
  queryClient.invalidateQueries({ queryKey: publicQueryKeys.categories.all });
}

export function subscribeAdminRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
