interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-12 bg-white/95 backdrop-blur-sm shadow-xs z-10 h-11 lg:h-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <h1 className="text-sm lg:text-base font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <span className="text-xs text-gray-400 truncate hidden sm:block">
              {subtitle}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
