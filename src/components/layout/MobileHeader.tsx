import logoDox from '@/assets/logo-dox.svg'

interface MobileHeaderProps {
  onOpenMenu: () => void
}

export default function MobileHeader({ onOpenMenu }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-30 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Abrir menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="flex-1 flex justify-center">
        <img src={logoDox} alt="Dox" className="h-7" />
      </div>

      {/* Spacer para centralizar o logo */}
      <div className="w-10" />
    </header>
  )
}
