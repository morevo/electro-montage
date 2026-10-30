type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Админские списки держат данные в локальном состоянии хуков, а редакторы
 * сохраняют через API напрямую. Чтобы после сохранения/удаления список не
 * показывал устаревшие данные, редакторы дёргают refreshAdminData(), а
 * useCategories/usePhotos перезапрашивают свои данные.
 */
export function refreshAdminData(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeAdminRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
