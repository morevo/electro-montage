import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown, HiCheck } from 'react-icons/hi';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Выпадающий список в стиле админки (вместо нативного select).
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Выберите значение',
  className = '',
  ariaLabel,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary border text-sm text-left transition-colors outline-none
                   disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: open ? 'var(--color-accent, #f59e0b)' : 'var(--color-border)',
          color: selected ? 'var(--color-on-surface)' : 'var(--color-on-muted)',
          boxShadow: open ? '0 0 0 2px rgba(245, 158, 11, 0.15)' : 'none',
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <HiOutlineChevronDown className="text-lg text-on-muted" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-accent/20 shadow-2xl p-1.5"
            style={{ background: 'var(--color-primary)' }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors
                      ${isSelected ? 'text-accent bg-accent/10' : 'text-on-muted hover:text-on-surface hover:bg-accent/5'}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <HiCheck className="text-base flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3 py-3 text-sm text-on-muted/60">Нет вариантов</li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
