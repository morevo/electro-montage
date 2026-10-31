import type { CSSProperties, ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
  rounded?: string
}

/**
 * Базовый скелетон: плавный блик по поверхности.
 * Один и тот же приём используют публичные страницы и админка,
 * чтобы состояния загрузки выглядели одинаково.
 */
export function Skeleton({ className = '', style, rounded = 'rounded-2xl' }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton ${rounded} ${className}`} style={style} />
}

export function SkeletonText({
  lines = 2,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          rounded="rounded-md"
          className="h-3"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

interface PlaceholderCardProps {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}

/**
 * Мягкая заглушка вместо текста ошибки: тот же ритм и рамка, что у карточек,
 * но без «красного» и без технических подробностей.
 */
export function PlaceholderCard({ icon, title, hint, action, className = '' }: PlaceholderCardProps) {
  return (
    <div
      className={`placeholder-card flex flex-col items-center justify-center text-center gap-3 px-6 py-10 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-2xl">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-on-strong">{title}</p>
        {hint && <p className="text-on-muted text-sm mt-1">{hint}</p>}
      </div>
      {action}
    </div>
  )
}
