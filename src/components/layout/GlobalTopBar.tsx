import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { SettingsIcon } from '@/components/icons'

interface GlobalTopBarProps {
  onOpenProfessionalModal: () => void
  sidebarWidth: string
  isMobile: boolean
  onOpenMenu?: () => void
}

export default function GlobalTopBar({
  onOpenProfessionalModal,
  sidebarWidth,
  isMobile,
  onOpenMenu,
}: GlobalTopBarProps) {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header
      className="fixed top-0 right-0 h-12 bg-white/80 backdrop-blur-xl border-b border-gray-200 z-40 flex items-center px-4 gap-3"
      style={{ left: isMobile ? 0 : sidebarWidth }}
    >
      {/* Mobile: menu hamburger */}
      {isMobile && onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex items-center justify-center w-9 h-9 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Configurações profissionais */}
      <button
        type="button"
        onClick={onOpenProfessionalModal}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Configurações profissionais"
      >
        <SettingsIcon size={18} />
      </button>

      {/* Avatar + menu do usuário */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 rounded-full transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-gray-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false)
                onOpenProfessionalModal()
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Configurações profissionais
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false)
                logout()
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
