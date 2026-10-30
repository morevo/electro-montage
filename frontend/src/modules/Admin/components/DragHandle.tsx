import type { ButtonHTMLAttributes, MouseEventHandler } from 'react';
import GripIcon from './GripIcon';

type DragHandleProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Единая ручка перетаскивания для категорий и фото.
 * Один и тот же рисунок (6 точек в две колонки), размер, радиус и ховер —
 * чтобы в админке не было двух разных «ручек».
 */
export default function DragHandle({ className = '', onClick, ...props }: DragHandleProps) {
  // Клик по ручке не должен открывать карточку: после перетаскивания браузер
  // всё равно присылает click, и без этого всплытие открывало редактор.
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onClick?.(event);
  };

  return (
    <button
      type="button"
      {...props}
      onClick={handleClick}
      aria-label={props['aria-label'] ?? 'Перетащить для изменения порядка'}
      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
        bg-primary/70 backdrop-blur-sm border border-[var(--color-border)]
        text-on-muted/80 transition-colors duration-200 touch-none
        hover:text-accent hover:border-accent/40 hover:bg-accent/10
        cursor-grab active:cursor-grabbing active:bg-accent/15
        disabled:opacity-30 disabled:cursor-not-allowed
        disabled:hover:text-on-muted/70 disabled:hover:border-[var(--color-border)]
        disabled:hover:bg-primary/70 ${className}`}
    >
      <GripIcon className="text-[18px]" />
    </button>
  );
}
