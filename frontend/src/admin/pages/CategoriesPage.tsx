import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineDotsVertical, HiOutlineFolder } from 'react-icons/hi';
import { useCategories } from '../hooks/useCategories';

const AMBER = '#f59e0b';

/* ── Сортируемый элемент категории ── */
interface CategoryItemProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    sortOrder: number;
    _count?: { photos: number };
  };
  onEdit: (cat: any) => void;
  onDelete: (id: string) => void;
}

function CategoryItem({ category, onEdit, onDelete }: CategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-4 p-4 rounded-xl bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-colors"
      whileHover={{ x: 4 }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-on-muted/50 hover:text-accent cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-accent/10 transition-colors"
        aria-label="Перетащить для изменения порядка"
      >
        <HiOutlineDotsVertical className="text-xl" />
      </button>

      {/* Инфо категории */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-on-surface truncate">{category.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-primary text-on-muted">
            {category.slug}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">
            {category._count?.photos || 0} фото
          </span>
        </div>
        {category.description && (
          <p className="text-sm text-on-muted/70 truncate mt-1">{category.description}</p>
        )}
      </div>

      {/* Действия */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(category)}
          className="p-2 rounded-lg text-on-muted hover:text-accent hover:bg-accent/10 transition-colors"
          aria-label="Редактировать"
        >
          <HiOutlinePencil className="text-lg" />
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="p-2 rounded-lg text-on-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          aria-label="Удалить"
        >
          <HiOutlineTrash className="text-lg" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Модалка создания/редактирования ── */
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; slug: string; description?: string }) => Promise<void>;
  initialData?: { name: string; slug: string; description?: string } | null;
  loading: boolean;
}

function CategoryModal({ isOpen, onClose, onSubmit, initialData, loading }: CategoryModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !slug.trim()) {
      setError('Заполните название и слаг');
      return;
    }
    try {
      await onSubmit({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-surface border border-[var(--color-border)] rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: `0 0 40px ${AMBER}10, 0 25px 50px rgba(0,0,0,0.3)` }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-on-surface">
                  {initialData ? 'Редактировать категорию' : 'Новая категория'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-on-muted hover:text-on-surface hover:bg-primary transition-colors"
                  aria-label="Закрыть"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm text-center text-red-400 bg-red-400/10 border border-red-400/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-on-muted mb-1">Название *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Например: Электропроводка"
                    className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-on-muted mb-1">Слаг (URL) *</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="elektrovodka"
                    className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                  <p className="text-xs text-on-muted/50 mt-1">Только латиница, цифры и дефисы</p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-on-muted mb-1">Описание</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Краткое описание категории"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-medium text-on-surface bg-primary border border-[var(--color-border)] hover:border-accent/30 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
                      color: '#0a1628',
                      boxShadow: `0 4px 15px ${AMBER}40`,
                      border: 'none',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Сохранение...' : (initialData ? 'Сохранить' : 'Создать')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Основная страница категорий ── */
export default function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, deleteCategory, reorderCategories } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      const newCategories = [...categories];
      const [removed] = newCategories.splice(oldIndex, 1);
      newCategories.splice(newIndex, 0, removed);

      const items = newCategories.map((cat, index) => ({
        id: cat.id,
        sortOrder: index,
      }));

      setModalLoading(true);
      try {
        await reorderCategories(items);
      } catch (e) {
        console.error('Reorder failed:', e);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSubmit = async (data: { name: string; slug: string; description?: string }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      await createCategory(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить категорию и все фото в ней? Это действие необратимо.')) {
      await deleteCategory(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Категории портфолио</h1>
          <p className="text-on-muted text-sm mt-1">Перетаскивайте для изменения порядка отображения на сайте</p>
        </div>
        <motion.button
          onClick={openCreateModal}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm"
          style={{
            background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
            color: '#0a1628',
            boxShadow: `0 4px 15px ${AMBER}40`,
            border: 'none',
          }}
        >
          <HiOutlinePlus className="text-lg" /> Добавить категорию
        </motion.button>
      </div>

      {/* Список категорий */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="h-20 bg-surface/50 rounded-xl animate-pulse"
                />
              ))
            ) : categories.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 rounded-2xl bg-surface/50 border border-[var(--color-border)] border-dashed"
              >
                <HiOutlineFolder className="text-4xl text-on-muted/30 mx-auto mb-3" />
                <p className="text-on-muted">Категорий пока нет</p>
                <p className="text-sm text-on-muted/50 mt-1">Создайте первую категорию для портфолио</p>
              </motion.div>
            ) : (
              categories.map((cat, index) => (
                <CategoryItem
                  key={cat.id}
                  category={cat}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCategory(null); }}
        onSubmit={handleSubmit}
        initialData={editingCategory}
        loading={modalLoading}
      />
    </div>
  );
}