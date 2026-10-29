import { useState, useCallback, useEffect } from 'react';
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
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineDotsVertical, HiOutlineArrowUp, HiOutlineX, HiOutlineCamera } from 'react-icons/hi';
import { usePhotos } from '../hooks/usePhotos';
import { useCategories } from '../hooks/useCategories';
import { Category, Photo } from '../types';

const AMBER = '#f59e0b';

/* ── Сортируемое фото в списке ── */
interface PhotoItemProps {
  photo: Photo;
  onEdit: (photo: Photo) => void;
  onDelete: (id: string) => void;
}

function PhotoItem({ photo, onEdit, onDelete }: PhotoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const imageUrl = photo.url || `/uploads/portfolio/${photo.filename}`;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-4 p-3 rounded-xl bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-colors"
      whileHover={{ x: 4 }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-on-muted/50 hover:text-accent cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-accent/10 transition-colors flex-shrink-0"
        aria-label="Перетащить для изменения порядка"
      >
        <HiOutlineDotsVertical className="text-xl" />
      </button>

      {/* Превью */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative bg-primary">
        <img
          src={imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {photo.width && photo.height && (
          <span className="absolute bottom-0 right-0 m-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
            {photo.width}×{photo.height}
          </span>
        )}
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-on-surface truncate">{photo.title}</h3>
        <p className="text-xs text-on-muted/60 truncate">{photo.description || 'Без описания'}</p>
        <p className="text-[11px] text-on-muted/40 mt-0.5">
          {photo.category?.name || 'Без категории'} • {photo.sortOrder + 1} в очереди
        </p>
      </div>

      {/* Действия */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(photo)}
          className="p-2 rounded-lg text-on-muted hover:text-accent hover:bg-accent/10 transition-colors"
          aria-label="Редактировать"
        >
          <HiOutlinePencil className="text-lg" />
        </button>
        <button
          onClick={() => onDelete(photo.id)}
          className="p-2 rounded-lg text-on-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          aria-label="Удалить"
        >
          <HiOutlineTrash className="text-lg" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Модалка загрузки/редактирования фото ── */
interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  categories: Category[];
  initialPhoto?: Photo | null;
  loading: boolean;
}

function PhotoModal({ isOpen, onClose, onSubmit, categories, initialPhoto, loading }: PhotoModalProps) {
  const [title, setTitle] = useState(initialPhoto?.title || '');
  const [description, setDescription] = useState(initialPhoto?.description || '');
  const [categoryId, setCategoryId] = useState(initialPhoto?.categoryId || categories[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPhoto ? (initialPhoto.url || `/uploads/portfolio/${initialPhoto.filename}`) : null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
        setError('Только JPG, PNG, WebP');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Максимум 10 МБ');
        return;
      }
      setFile(selectedFile);
      setError('');
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Введите название');
      return;
    }
    if (!initialPhoto && !file) {
      setError('Выберите файл');
      return;
    }
    if (!categoryId) {
      setError('Выберите категорию');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    formData.append('categoryId', categoryId);
    if (file) formData.append('file', file);
    if (initialPhoto) formData.append('photoId', initialPhoto.id);

    try {
      await onSubmit(formData);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setFile(null);
    setPreview(null);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialPhoto) {
        setTitle(initialPhoto.title);
        setDescription(initialPhoto.description || '');
        setCategoryId(initialPhoto.categoryId);
        setPreview(initialPhoto.url || `/uploads/portfolio/${initialPhoto.filename}`);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialPhoto, categories]);

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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-[var(--color-border)] rounded-2xl"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: `0 0 40px ${AMBER}10, 0 25px 50px rgba(0,0,0,0.3)` }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-on-surface">
                  {initialPhoto ? 'Редактировать фото' : 'Загрузить фото'}
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
                {/* Превью */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-on-muted mb-2">Превью</label>
                  <div className="aspect-video rounded-xl overflow-hidden bg-primary relative">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-muted/30">
                        <HiOutlineArrowUp className="text-4xl" />
                      </div>
                    )}
                    {preview && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        aria-label="Удалить превью"
                      >
                        <HiOutlineX className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Файл */}
                {!initialPhoto && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-on-muted mb-2">Файл *</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/20 file:text-accent hover:file:bg-accent/30 transition-colors"
                      required={!initialPhoto}
                    />
                  </div>
                )}

                {/* Название */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-on-muted mb-1">Название *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Название фото"
                    className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    required
                  />
                </div>

                {/* Категория */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-on-muted mb-1">Категория *</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Описание */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-on-muted mb-1">Описание</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Описание фото (необязательно)"
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
                    {loading ? 'Сохранение...' : (initialPhoto ? 'Сохранить' : 'Загрузить')}
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

/* ── Основная страница фото ── */
export default function PhotosPage() {
  const { photos, loading, fetchPhotos, uploadPhoto, updatePhoto, deletePhoto, reorderPhotos, pagination } = usePhotos();
  const { categories } = useCategories();
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const filteredPhotos = photos.filter(p => !categoryFilter || p.categoryId === categoryFilter);
      const oldIndex = filteredPhotos.findIndex(p => p.id === active.id);
      const newIndex = filteredPhotos.findIndex(p => p.id === over.id);
      const newPhotos = [...filteredPhotos];
      const [removed] = newPhotos.splice(oldIndex, 1);
      newPhotos.splice(newIndex, 0, removed);

      const items = newPhotos.map((p, index) => ({
        id: p.id,
        sortOrder: index,
      }));

      setModalLoading(true);
      try {
        await reorderPhotos(categoryFilter || photos[0]?.categoryId || '', items);
        await fetchPhotos(categoryFilter);
      } catch (e) {
        console.error('Reorder failed:', e);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const handleFilterChange = async (catId: string) => {
    setCategoryFilter(catId);
    await fetchPhotos(catId || undefined);
  };

  const openCreateModal = () => {
    setEditingPhoto(null);
    setModalOpen(true);
  };

  const openEditModal = (photo: Photo) => {
    setEditingPhoto(photo);
    setModalOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    const photoId = formData.get('photoId') as string | null;
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const catId = formData.get('categoryId') as string;

    if (photoId) {
      await updatePhoto(photoId, { title, description: description || undefined, categoryId: catId });
    } else if (file) {
      await uploadPhoto(catId, file, title, description || undefined);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить фото? Это действие необратимо.')) {
      await deletePhoto(id);
    }
  };

  useEffect(() => {
    fetchPhotos(categoryFilter || undefined);
  }, [fetchPhotos, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтр */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Фото портфолио</h1>
          <p className="text-on-muted text-sm mt-1">Управляйте фото в категориях, перетаскивайте для изменения порядка</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Фильтр категории */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => handleFilterChange(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all appearance-none pr-10"
            >
              <option value="">Все категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat._count?.photos || 0})</option>
              ))}
            </select>
          </div>

          {/* Кнопка загрузки */}
          <motion.button
            onClick={openCreateModal}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap"
            style={{
              background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
              color: '#0a1628',
              boxShadow: `0 4px 15px ${AMBER}40`,
              border: 'none',
            }}
          >
            <HiOutlinePlus className="text-lg" /> Загрузить фото
          </motion.button>
        </div>
      </div>

      {/* Список фото */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={photos.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="h-24 bg-surface/50 rounded-xl animate-pulse"
                  />
                ))}
              </motion.div>
            ) : photos.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-12 rounded-2xl bg-surface/50 border border-[var(--color-border)] border-dashed"
              >
                <HiOutlineCamera className="text-4xl text-on-muted/30 mx-auto mb-3" />
                <p className="text-on-muted">{categoryFilter ? 'В этой категории фото нет' : 'Фото пока нет'}</p>
                <p className="text-sm text-on-muted/50 mt-1">Загрузите первое фото</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                {photos.map((photo, index) => (
                  <PhotoItem
                    key={photo.id}
                    photo={photo}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {/* Пагинация */}
      {pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => fetchPhotos(categoryFilter || undefined, pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-lg bg-surface border border-[var(--color-border)] text-on-muted hover:text-on-surface hover:border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>
          <span className="px-4 text-on-muted text-sm">
            Страница {pagination.page} из {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchPhotos(categoryFilter || undefined, pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-surface border border-[var(--color-border)] text-on-muted hover:text-on-surface hover:border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Вперёд
          </button>
        </motion.div>
      )}

      <PhotoModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPhoto(null); }}
        onSubmit={handleSubmit}
        categories={categories}
        initialPhoto={editingPhoto}
        loading={modalLoading}
      />
    </div>
  );
}