import { useState, useCallback, useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DragHandle from '../components/DragHandle';
import IconButton from '../components/IconButton';
import { DND_DROP_ANIMATION, DND_MEASURING, DND_TRANSITION, useAdminDndSensors } from '../lib/dnd';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragCancelEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCamera,
  HiOutlineDownload,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { usePhotos } from '../hooks/usePhotos';
import { useCategories } from '../hooks/useCategories';
import Select from '../components/Select';
import ConfirmDialog from '../components/ConfirmDialog';
import AdminCheckbox from '../components/AdminCheckbox';
import { refreshAdminData } from '../lib/refresh';
import type { Photo } from '../types';

const AMBER = '#f59e0b';

function photoUrl(photo: Photo) {
  return photo.url || `/uploads/portfolio/${photo.filename}`;
}

/* ── Карточка фото (список и «призрак» при перетаскивании) ── */
interface PhotoCardProps {
  photo: Photo;
  dragging?: boolean;
  overlay?: boolean;
  showPosition?: boolean;
  handle?: ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (photo: Photo) => void;
  onDelete?: (id: string) => void;
  /** Клик по всей карточке (открывает редактор). */
  onOpen?: (photo: Photo) => void;
}

function PhotoCard({
  photo,
  dragging,
  overlay,
  showPosition = true,
  handle,
  selectable,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onOpen,
}: PhotoCardProps) {
  const url = photoUrl(photo);
  // Карточка целиком кликабельна, а её кнопки гасят всплытие — поэтому
  // «скачать», «редактировать» и «удалить» срабатывают отдельно, не открывая фото.
  const openCard = !overlay && onOpen ? () => onOpen(photo) : undefined;

  return (
    <div
      onClick={openCard}
      className={`group relative flex flex-col h-full rounded-xl overflow-hidden bg-surface border
        transition-[border-color,box-shadow,transform,opacity] duration-200
        ${openCard ? 'cursor-pointer' : ''}
        ${dragging
          ? 'border-accent/50 border-dashed opacity-35'
          : 'border-[var(--color-border)] hover:border-accent/30'}
        ${overlay
          ? 'border-accent shadow-2xl ring-2 ring-accent/25 cursor-grabbing'
          : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20'}
        ${selected && !overlay ? 'border-accent/70 ring-2 ring-accent/40' : ''}`}
    >
      {/* Превью */}
      <div className="relative aspect-[4/3] bg-primary overflow-hidden">
        <img src={url} alt={photo.title} className="w-full h-full object-cover" loading="lazy" />

        {/* Ручка перетаскивания — та же, что в категориях */}
        {handle ?? <DragHandle className="absolute top-2 left-2 z-10" tabIndex={-1} aria-hidden />}

        {/* Чекбокс для массового удаления */}
        {selectable && !overlay && (
          <div className="absolute bottom-2 left-2 z-10">
            <AdminCheckbox
              checked={Boolean(selected)}
              onChange={() => onToggleSelect?.(photo.id)}
              label={`Выбрать ${photo.title}`}
            />
          </div>
        )}

        {/* Действия поверх превью */}
        {!overlay && (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-200"
          >
            <IconButton
              href={url}
              download={photo.originalName || photo.filename}
              label={`Скачать ${photo.title}`}
              title="Скачать фото"
            >
              <HiOutlineDownload />
            </IconButton>
            <IconButton
              href={url}
              target="_blank"
              rel="noreferrer"
              label={`Открыть ${photo.title}`}
              title="Открыть оригинал"
              className="hidden sm:inline-flex"
            >
              <HiOutlineExternalLink />
            </IconButton>
            <IconButton label="Редактировать" title="Редактировать" onClick={() => onEdit?.(photo)}>
              <HiOutlinePencil />
            </IconButton>
            <IconButton
              label="Удалить"
              title="Удалить"
              variant="glass-danger"
              onClick={() => onDelete?.(photo.id)}
            >
              <HiOutlineTrash />
            </IconButton>
          </div>
        )}

        {showPosition && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/55 text-white/70 text-[10px]">
            {photo.sortOrder + 1}
          </span>
        )}
      </div>

      {/* Подпись */}
      <div className="p-3 min-w-0">
        <h3 className="font-medium text-on-surface text-sm truncate" title={photo.title}>
          {photo.title}
        </h3>
        <p className="text-[11px] text-on-muted/60 truncate mt-0.5" title={photo.description || undefined}>
          {photo.description || 'Без описания'}
        </p>
        <p className="text-[11px] text-on-muted/40 truncate mt-1">
          {photo.category?.name || 'Без категории'}
          {photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ''}
        </p>
      </div>
    </div>
  );
}

/* ── Сортируемая карточка в сетке ── */
interface SortablePhotoProps {
  photo: Photo;
  sortable: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (photo: Photo) => void;
  onDelete: (id: string) => void;
}

function SortablePhoto({
  photo,
  sortable,
  selectable,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: photo.id,
    disabled: !sortable,
  });

  // Пока карточка «в руке», её transform отключаем: двигается только DragOverlay.
  // Остальные карточки плавно переезжают в освободившийся слот.
  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : DND_TRANSITION,
    zIndex: isDragging ? 1 : undefined,
    willChange: isDragging ? 'transform' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      {/* Только вход/выход: перестроение двигает dnd-kit своим transform.
          framer layout спорил с ним и давал рывок «мелькнула и вернулась». */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        <PhotoCard
          photo={photo}
          dragging={isDragging}
          showPosition={sortable}
          selectable={selectable}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpen={onEdit}
          handle={
            <DragHandle
              {...attributes}
              {...listeners}
              disabled={!sortable}
              className="absolute top-2 left-2 z-10"
              title={sortable ? 'Перетащите, чтобы изменить порядок' : 'Выберите категорию, чтобы менять порядок'}
            />
          }
        />
      </motion.div>
    </div>
  );
}

/* ── Страница фото ── */
export default function PhotosPage() {
  const navigate = useNavigate();
  const { photos, loading, fetchPhotos, deletePhotos, reorderPhotos, pagination } = usePhotos();
  const { categories } = useCategories();
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const sensors = useAdminDndSensors();

  // Порядок имеет смысл только внутри категории — на сайте фото
  // группируются по категориям, у каждой свой sortOrder.
  const canReorder = Boolean(categoryFilter);
  const activePhoto = photos.find((p) => p.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    if (!canReorder) return;
    setActiveId(String(event.active.id));
    setActiveWidth(event.active.rect.current.initial?.width);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
    setActiveWidth(undefined);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!canReorder || !over || active.id === over.id) {
      setActiveId(null);
      setActiveWidth(undefined);
      return;
    }

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...photos];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    // Учитываем страницу пагинации: иначе фото со страницы 2 получают
    // sortOrder 0..19 и «перебивают» порядок фото с первой страницы.
    const offset = (pagination.page - 1) * pagination.limit;
    const items = reordered.map((p, index) => ({ id: p.id, sortOrder: offset + index }));

    // Оптимистично: usePhotos переставляет карточки локально до ответа сервера,
    // поэтому дополнительный перезапрос вернул бы старый порядок на мгновение —
    // именно этот рывок и мигал после дропа.
    //
    // Overlay гасим в том же коммите, что и смену порядка, — карточка не
    // успевает показаться на старом месте и сразу встаёт в новый слот.
    setActiveId(null);
    setActiveWidth(undefined);

    try {
      await reorderPhotos(categoryFilter, items);
      toast.success('Порядок фото обновлён');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось изменить порядок');
    }
  };

  const handleFilterChange = async (catId: string) => {
    setCategoryFilter(catId);
    setSelectedIds([]);
    await fetchPhotos(catId || undefined, 1);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === photos.length ? [] : photos.map((photo) => photo.id)));
  };

  /* Удаление — через общее окно подтверждения, а не window.confirm */
  const requestDelete = (id: string) => setConfirmIds([id]);

  const handleConfirmDelete = async () => {
    if (confirmIds.length === 0) return;
    setDeleting(true);
    try {
      const deleted = await deletePhotos(confirmIds);
      setSelectedIds((prev) => prev.filter((id) => !confirmIds.includes(id)));
      refreshAdminData();
      toast.success(deleted === 1 ? 'Фото удалено' : `Удалено фото: ${deleted}`);
      setConfirmIds([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить фото');
    } finally {
      setDeleting(false);
    }
  };

  const openEditor = useCallback((photo: Photo) => navigate(`/admin/photos/${photo.id}/edit`), [navigate]);

  const openCreate = () => {
    navigate(`/admin/photos/new${categoryFilter ? `?category=${categoryFilter}` : ''}`);
  };

  useEffect(() => {
    fetchPhotos(categoryFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  return (
    <div className="space-y-6 w-full">
      {/* Заголовок и фильтр */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Фото портфолио</h1>
          <p className="text-on-muted text-sm mt-1">
            {pagination.total > 0 ? `${pagination.total} фото · ` : ''}
            {canReorder ? 'перетаскивайте карточку за ручку, чтобы изменить порядок' : 'выберите категорию, чтобы менять порядок'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-shrink-0">
          <div className="relative w-full sm:w-64">
            <Select
              value={categoryFilter}
              onChange={handleFilterChange}
              ariaLabel="Фильтр по категории"
              options={[
                { value: '', label: 'Все категории' },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: `${cat.name} (${cat._count?.photos || 0})`,
                })),
              ]}
            />
          </div>

          <motion.button
            onClick={openCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap"
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

      {!canReorder && photos.length > 0 && (
        <p className="text-xs text-on-muted/60 rounded-lg border border-[var(--color-border)] bg-surface/40 px-3 py-2">
          Чтобы менять порядок фото, выберите конкретную категорию в фильтре — в режиме «Все
          категории» порядок на сайте не применяется.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="aspect-[4/3] bg-surface/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-14 rounded-2xl bg-surface/40 border border-[var(--color-border)] border-dashed">
          <HiOutlineCamera className="text-4xl text-on-muted/30 mx-auto mb-3" />
          <p className="text-on-muted">{categoryFilter ? 'В этой категории фото нет' : 'Фото пока нет'}</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
          >
            Загрузить первое фото
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={DND_MEASURING}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <AnimatePresence initial={false}>
                {photos.map((photo) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    sortable={canReorder}
                    selectable
                    selected={selectedIds.includes(photo.id)}
                    onToggleSelect={toggleSelect}
                    onEdit={openEditor}
                    onDelete={requestDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>

          {/* Портал обязателен: у страницы есть transform от framer-motion,
              и fixed-оверлей без портала «улетает» в сторону от курсора */}
          {createPortal(
            <DragOverlay
              dropAnimation={DND_DROP_ANIMATION}
              style={{ cursor: 'grabbing' }}
            >
              {activePhoto ? (
                <div
                  style={{ width: activeWidth }}
                  className="pointer-events-none scale-[1.02] will-change-transform"
                >
                  <PhotoCard photo={activePhoto} overlay showPosition={false} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      {/* Пагинация — появляется/исчезает плавно при изменении порядка или фильтра */}
      <AnimatePresence initial={false}>
      {pagination.totalPages > 1 && (
        <motion.div
          key="pagination"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => fetchPhotos(categoryFilter || undefined, pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 rounded-lg bg-surface border border-[var(--color-border)] text-on-muted hover:text-on-surface hover:border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Назад
          </button>
          <span className="px-4 text-on-muted text-sm whitespace-nowrap">
            Страница {pagination.page} из {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchPhotos(categoryFilter || undefined, pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-surface border border-[var(--color-border)] text-on-muted hover:text-on-surface hover:border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Вперёд
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      <p className="text-[11px] text-on-muted/40">
        Скачать фото можно кнопкой на карточке или в редакторе фото. Отметьте чекбоксы на
        карточках, чтобы удалить несколько фото сразу.
      </p>

      {/* Панель выделения — в портале, чтобы её не уносило transform-анимацией страницы */}
      {createPortal(
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 16, x: '-50%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="admin-bulkbar fixed bottom-4 left-1/2 z-[9998] flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-2xl"
            >
              <span className="text-xs text-on-muted pl-1 whitespace-nowrap">
                Выбрано: <b className="text-on-surface">{selectedIds.length}</b>
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-2 rounded-lg text-xs font-medium text-on-muted hover:text-on-surface transition-colors whitespace-nowrap"
              >
                {selectedIds.length === photos.length ? 'Снять все' : 'Выбрать все'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmIds(selectedIds)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors whitespace-nowrap"
              >
                <HiOutlineTrash /> Удалить
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmDialog
        open={confirmIds.length > 0}
        title={confirmIds.length === 1 ? 'Удалить фото?' : `Удалить ${confirmIds.length} фото?`}
        description="Файлы будут удалены с сервера без возможности восстановления."
        confirmLabel={confirmIds.length === 1 ? 'Удалить' : `Удалить (${confirmIds.length})`}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmIds([]);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
