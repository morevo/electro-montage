/**
 * Ручка перетаскивания: 6 точек в две колонки.
 * Используется одинаково в списке категорий и в сетке фото.
 */
export default function GripIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="5.5" cy="4" r="1.35" />
      <circle cx="10.5" cy="4" r="1.35" />
      <circle cx="5.5" cy="8" r="1.35" />
      <circle cx="10.5" cy="8" r="1.35" />
      <circle cx="5.5" cy="12" r="1.35" />
      <circle cx="10.5" cy="12" r="1.35" />
    </svg>
  );
}
