import type { MouseEvent, ReactNode } from 'react';

type Variant = 'glass' | 'glass-danger' | 'ghost' | 'danger' | 'accent';

interface IconButtonProps {
  /** Доступное имя (aria-label). Обязательно: иконка без текста. */
  label: string;
  title?: string;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Если задан — рендерится ссылка (скачать / открыть оригинал). */
  href?: string;
  download?: string | boolean;
  target?: string;
  rel?: string;
}

/**
 * Единая квадратная кнопка-иконка админки: 36×36 и иконка 18px.
 * Раньше в списках и в редакторе фото были разные размеры (16 и 17px),
 * из-за чего кнопки удаления выглядели почти невидимыми — теперь
 * минимальный размер иконки задан здесь и одинаков везде.
 */
const BASE =
  'inline-flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg text-[18px] leading-none ' +
  'select-none transition-colors duration-200 focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent/60 disabled:opacity-35 disabled:cursor-not-allowed';

const VARIANTS: Record<Variant, string> = {
  /* Поверх фотографии: тёмное стекло, акцент на ховере. */
  glass:
    'bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 ' +
    'hover:bg-accent hover:text-primary hover:border-accent',
  /* То же стекло, но удаление. */
  'glass-danger':
    'bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 ' +
    'hover:bg-red-500 hover:text-white hover:border-red-400',
  /* На поверхности карточки: нейтральная, акцент на ховере. */
  ghost:
    'bg-primary/40 text-on-muted border border-transparent ' +
    'hover:text-accent hover:bg-accent/10 hover:border-accent/30',
  /* Нейтральная, но удаление. */
  danger:
    'bg-primary/40 text-on-muted border border-transparent ' +
    'hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30',
  /* Заметное действие (например, «добавить»). */
  accent:
    'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 hover:border-accent/50',
};

export default function IconButton({
  label,
  title,
  variant = 'glass',
  className = '',
  disabled,
  children,
  onClick,
  href,
  download,
  target,
  rel,
}: IconButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`.trim();
  const caption = title ?? label;

  if (href) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        onClick={onClick}
        className={classes}
        aria-label={label}
        title={caption}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={label}
      title={caption}
    >
      {children}
    </button>
  );
}
