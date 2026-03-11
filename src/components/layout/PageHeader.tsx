interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 h-14 lg:h-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base lg:text-lg font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs lg:text-sm text-gray-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
