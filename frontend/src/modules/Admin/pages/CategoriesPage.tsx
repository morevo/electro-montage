import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFolder,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from 'react-icons/hi';
import DragHandle from '../components/DragHandle';
import IconButton from '../components/IconButton';
import { DND_DROP_ANIMATION, DND_MEASURING, DND_TRANSITION, useAdminDndSensors } from '../lib/dnd';
import toast from 'react-hot-toast';
import { useCategories } from '../hooks/useCategories';
import ConfirmDialog from '../components/ConfirmDialog';
import { refreshAdminData } from '../lib/refresh';
import type { Category } from '../types';

const AMBER = '#f59e0b';

const navButton =
  'px-2 py-2 text-on-muted hover:text-accent hover:bg-accent/10 transition-colors ' +
  'disabled:text-on-muted/25 disabled:hover:bg-transparent disabled:cursor-not-allowed';

/* ── Сортируемый элемент категории ── */
interface CategoryCardProps {
  category: Category;
  dragging?: boolean;
  overlay?: boolean;
  handle?: ReactNode;
  onEdit?: (cat: Category) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  actionsDisabled?: boolean;
}

function CategoryCard({
  category,
  dragging,
  overlay,
  handle,
  onEdit,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
  actionsDisabled,
}: CategoryCardProps) {
  return (
    <div
      // Вся карточка открывает редактор, а блок действий гасит всплытие:
      // кликабельны и карточка целиком, и каждая кнопка по отдельности.
      onClick={overlay ? undefined : () => onEdit?.(category)}
      className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface border
        transition-[border-color,background-color,box-shadow,opacity] duration-200
        ${overlay ? '' : 'cursor-pointer'}
        ${dragging
          ? 'border-accent/50 bg-accent/[0.04] border-dashed opacity-40'
          : 'border-[var(--color-border)] hover:border-accent/30'}
        ${overlay ? 'border-accent shadow-2xl ring-2 ring-accent/25 cursor-grabbing' : ''}`}
    >
      {handle}

      {/* Инфо категории */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-bold text-on-surface truncate">{category.name}</h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent whitespace-nowrap">
            {category._count?.photos || 0} фото
          </span>
        </div>
        {category.description && (
          <p className="text-sm text-on-muted/70 truncate mt-1">{category.description}</p>
        )}
      </div>

      {/* Действия */}
      {!overlay && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="flex items-center gap-1 sm:gap-1.5 transition-opacity duration-200 opacity-100 sm:opacity-70 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          {/* Кнопки навигации по порядку — плавно проявляются вместе с остальными */}
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-primary/40 overflow-hidden">
            <button
              type="button"
              onClick={() => onMove?.(category.id, -1)}
              disabled={!canMoveUp || actionsDisabled}
              className={navButton}
              aria-label={`Поднять ${category.name} выше`}
              title="Поднять выше"
            >
              <HiOutlineChevronUp className="text-[18px]" />
            </button>
            <span className="w-px h-5 bg-[var(--color-border)]" aria-hidden />
            <button
              type="button"
              onClick={() => onMove?.(category.id, 1)}
              disabled={!canMoveDown || actionsDisabled}
              className={navButton}
              aria-label={`Опустить ${category.name} ниже`}
              title="Опустить ниже"
            >
              <HiOutlineChevronDown className="text-[18px]" />
            </button>
          </div>

          <IconButton variant="ghost" label="Редактировать" onClick={() => onEdit?.(category)}>
            <HiOutlinePencil />
          </IconButton>
          <IconButton variant="danger" label="Удалить" onClick={() => onDelete?.(category.id)}>
            <HiOutlineTrash />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function CategoryItem({
  category,
  index,
  total,
  onEdit,
  onDelete,
  onMove,
  actionsDisabled,
}: {
  category: Category;
  index: number;
  total: number;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  actionsDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: category.id,
  });

  // Пока карточка «в руке», не двигаем её саму — двигается DragOverlay.
  // Остальные элементы расходятся с той же кривой, что и сетка фото.
  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : DND_TRANSITION,
    position: 'relative',
    zIndex: isDragging ? 1 : undefined,
    willChange: isDragging ? 'transform' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Только вход/выход: перестроение двигает dnd-kit своим transform.
          framer layout спорил с ним и давал рывок «мелькнула и вернулась». */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <CategoryCard
          category={category}
          dragging={isDragging}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          actionsDisabled={actionsDisabled}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          handle={<DragHandle {...attributes} {...listeners} title="Перетащите, чтобы изменить порядок" />}
        />
      </motion.div>
    </div>
  );
}

/* ── Основная страница категорий ── */
export default function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading, deleteCategory, reorderCategories } = useCategories();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | undefined>(undefined);
  const [savingOrder, setSavingOrder] = useState(false);
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useAdminDndSensors();

  const activeCategory = categories.find(c => c.id === activeId) ?? null;

  const applyOrder = async (ordered: Category[]) => {
    setSavingOrder(true);
    try {
      await reorderCategories(ordered.map((cat, index) => ({ id: cat.id, sortOrder: index })));
      toast.success('Порядок категорий обновлён');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось изменить порядок');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setActiveWidth(event.active.rect.current.initial?.width);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveWidth(undefined);
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...categories];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed);
    await applyOrder(next);
  };

  // Навигация стрелками — предсказуемая альтернатива перетаскиванию
  const handleMove = async (id: string, direction: -1 | 1) => {
    const index = categories.findIndex(c => c.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;

    const next = [...categories];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    await applyOrder(next);
  };

  // Форма живёт на отдельной странице — так же, как и для фото.
  // Переход список ↔ форма анимируется общим AnimatePresence в App.tsx.
  const openCreatePage = () => navigate('/admin/categories/new');

  const openEditPage = (cat: Category) =>
    navigate(`/admin/categories/${cat.id}/edit`);

  /* Удаление — через общее окно подтверждения, а не системный confirm */
  const requestDelete = (id: string) => setConfirmCategory(categories.find((cat) => cat.id === id) ?? null);

  const handleConfirmDelete = async () => {
    if (!confirmCategory) return;
    setDeleting(true);
    try {
      await deleteCategory(confirmCategory.id);
      refreshAdminData();
      toast.success('Категория удалена');
      setConfirmCategory(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить категорию');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Категории портфолио</h1>
          <p className="text-on-muted text-sm mt-1">
            Меняйте порядок стрелками ↑↓ или перетаскиванием за ручку — он сразу применяется на сайте
          </p>
        </div>
        <motion.button
          onClick={openCreatePage}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap flex-shrink-0"
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
        measuring={DND_MEASURING}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setActiveWidth(undefined);
        }}
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
              <AnimatePresence initial={false}>
                {categories.map((cat, index) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    index={index}
                    total={categories.length}
                    onEdit={openEditPage}
                    onDelete={requestDelete}
                    onMove={handleMove}
                    actionsDisabled={savingOrder}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </SortableContext>

        {/* Портал обязателен: у страницы есть transform от framer-motion,
            иначе fixed-оверлей уезжает в сторону от курсора */}
        {createPortal(
          <DragOverlay
            dropAnimation={DND_DROP_ANIMATION}
            style={{ cursor: 'grabbing' }}
          >
            {activeCategory ? (
              <div
                style={{ width: activeWidth }}
                className="pointer-events-none scale-[1.02] will-change-transform"
              >
                <CategoryCard category={activeCategory} overlay />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <ConfirmDialog
        open={Boolean(confirmCategory)}
        title="Удалить категорию?"
        description={
          confirmCategory
            ? `Категория «${confirmCategory.name}» и все её фото (${confirmCategory._count?.photos || 0}) будут удалены без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmCategory(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
