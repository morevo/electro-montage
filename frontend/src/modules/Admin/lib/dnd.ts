import {
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Общие настройки перетаскивания для всех списков админки.
 *
 * Категории и фото раньше настраивали dnd-kit по отдельности: разный порог
 * срабатывания, разная длительность анимации и разный способ замера позиций.
 * Из-за этого перетаскивание в двух списках ощущалось как две разные фичи,
 * а «постоянный» замер давал дёрганье карточек. Теперь настройки в одном
 * месте — поведение одинаковое везде.
 */

/** Плавное «приземление» карточки после drop. */
export const DND_DROP_ANIMATION = {
  duration: 200,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

/** Перестроение соседних карточек: та же кривая, что у drop-анимации. */
export const DND_TRANSITION = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Замеряем позиции только во время перетаскивания. Стратегия Always
 * пересчитывала прямоугольники на каждый рендер и вместе с layout-анимацией
 * давала кратковременный рывок «мелькнула — вернулась — встала».
 */
export const DND_MEASURING = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
};

/** Сенсоры: мышь/тач с порогом 5px (клик по кнопкам не превращается в drag) и клавиатура. */
export function useAdminDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
