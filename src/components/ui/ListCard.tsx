import type { ReactNode, MouseEvent } from 'react'

interface ListCardProps {
  onClick: () => void
  avatar?: ReactNode
  title: string
  subtitle?: ReactNode
  pills?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
}

export default function ListCard({
  onClick,
  avatar,
  title,
  subtitle,
  pills,
  badges,
  actions,
}: ListCardProps) {
  const handleActionClick = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-200/80 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4 sm:p-5 flex items-center gap-4">
        {avatar && <div className="shrink-0">{avatar}</div>}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-700 transition-colors">
            {title}
          </h3>
          {subtitle && (
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              {subtitle}
            </div>
          )}
          {pills && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {pills}
            </div>
          )}
        </div>

        {badges && (
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {badges}
          </div>
        )}

        {actions && (
          <div
            className="hidden sm:flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleActionClick}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export function ListCardPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
      {children}
    </span>
  )
}

export function ListCardBadge({
  children,
  variant = 'default',
  icon,
}: {
  children: ReactNode
  variant?: 'default' | 'brand' | 'success' | 'warning'
  icon?: ReactNode
}) {
  const styles = {
    default: 'bg-gray-50 text-gray-500',
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
  }

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${styles[variant]}`}>
      {icon}
      {children}
    </span>
  )
}

export function ListCardAction({
  onClick,
  title,
  icon,
  variant = 'default',
}: {
  onClick: () => void
  title: string
  icon: ReactNode
  variant?: 'default' | 'brand' | 'danger'
}) {
  const styles = {
    default: 'hover:bg-gray-100 text-gray-400 hover:text-gray-600',
    brand: 'hover:bg-brand-50 text-gray-400 hover:text-brand-600',
    danger: 'hover:bg-red-50 text-gray-400 hover:text-red-500',
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`p-2 rounded-lg transition-colors ${styles[variant]}`}
      title={title}
    >
      {icon}
    </button>
  )
}

// ========== Shared Icons ==========

export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function EditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function DocumentPlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}
