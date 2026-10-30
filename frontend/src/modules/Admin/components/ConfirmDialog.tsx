import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineExclamation } from 'react-icons/hi';

/**
 * Общее окно подтверждения в стиле админки — вместо window.confirm,
 * который выглядит как системный alert. Отрисовывается в portal, чтобы
 * fixed-оверлей не «уезжал» от transform-анимации страницы.
 */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  danger = true,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !loading && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface border border-[var(--color-border)] p-6"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${
                  danger ? 'bg-red-400/10 text-red-400' : 'bg-accent/10 text-accent'
                }`}
              >
                <HiOutlineExclamation className="text-xl" />
              </span>
              <h2 className="text-lg font-bold text-on-surface">{title}</h2>
            </div>

            {description && <div className="text-sm text-on-muted mb-6">{description}</div>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-primary border border-[var(--color-border)] hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60 ${
                  danger ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent/90 text-primary'
                }`}
              >
                {loading ? 'Удаляем…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
