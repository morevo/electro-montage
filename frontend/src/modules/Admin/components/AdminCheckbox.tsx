import { HiOutlineCheck } from 'react-icons/hi';

interface AdminCheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

/**
 * Чекбокс админки: стеклянная плашка 28×28 с амбер-заливкой при выборе —
 * вместо системного белого квадрата, который выбивался из тёмных карточек.
 * Нативный input остаётся в DOM (sr-only), поэтому доступность, фокус
 * с клавиатуры и peer-checked работают как обычно.
 */
export default function AdminCheckbox({ checked, onChange, label, className = '' }: AdminCheckboxProps) {
  return (
    <label
      className={`group/cb relative inline-flex w-7 h-7 cursor-pointer select-none ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={(event) => event.stopPropagation()}
        className="peer sr-only"
        aria-label={label}
      />

      {/* Плашка: стекло + внутренний блик, чтобы читалась на любом фото */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[9px] border border-white/30
                   bg-[linear-gradient(160deg,rgba(10,22,40,0.72),rgba(6,14,26,0.88))]
                   shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_10px_rgba(0,0,0,0.5)]
                   transition-[background-color,border-color,box-shadow,transform] duration-150
                   group-hover/cb:border-white/60 group-hover/cb:scale-[1.06]
                   peer-checked:border-accent peer-checked:bg-[linear-gradient(135deg,#fbbf24,#f59e0b)]
                   peer-checked:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_14px_rgba(245,158,11,0.55)]
                   peer-focus-visible:ring-2 peer-focus-visible:ring-accent/70
                   peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-transparent"
      />

      {/* Галочка: появляется с лёгким «поп», тёмная — контраст на амбере */}
      <HiOutlineCheck
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto text-[17px] text-[#0a1628]
                   opacity-0 scale-50 transition-[opacity,transform] duration-150
                   peer-checked:opacity-100 peer-checked:scale-100"
      />
    </label>
  );
}
