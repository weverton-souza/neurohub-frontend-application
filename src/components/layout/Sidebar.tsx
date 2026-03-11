import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  DocumentIcon,
  UsersIcon,
  ClipboardListIcon,
  BookIcon,
  SettingsIcon,
} from '@/components/icons'
import type { IconProps } from '@/components/icons'
import logoDoxMark from '@/assets/logo-dox-mark.svg'
import logoDoxText from '@/assets/logo-dox-text.svg'

interface NavItemConfig {
  to: string
  label: string
  icon: (props: IconProps) => React.ReactNode
  matchPaths?: string[]
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/',
    label: 'Relatórios',
    icon: DocumentIcon,
    matchPaths: ['/relatorio/'],
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: UsersIcon,
    matchPaths: ['/clientes/'],
  },
  {
    to: '/formularios',
    label: 'Formulários',
    icon: ClipboardListIcon,
    matchPaths: ['/formulario/'],
  },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  onOpenProfessionalModal: () => void
  isMobile: boolean
  isMobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  onOpenProfessionalModal,
  isMobile,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation()

  const isActive = (item: NavItemConfig) => {
    if (location.pathname === item.to) return true
    if (item.matchPaths) {
      return item.matchPaths.some((p) => location.pathname.startsWith(p))
    }
    return false
  }

  // No mobile, fechar drawer ao clicar num link
  function handleNavClick() {
    if (isMobile) onCloseMobile()
  }

  // Sidebar content compartilhado entre desktop e mobile
  const sidebarContent = (
    <>
      {/* Brand */}
      <button
        type="button"
        onClick={isMobile ? onCloseMobile : onToggle}
        className="h-16 w-full flex flex-col justify-center border-b border-gray-200 px-4 shrink-0 overflow-hidden cursor-pointer"
      >
        <div className="flex items-center w-full">
          <img src={logoDoxMark} alt="DOX" className="h-7 w-auto shrink-0" />
          <img
            src={logoDoxText}
            alt="Dox"
            className={`h-7 w-auto ml-1 transition-opacity duration-300 ${
              !isMobile && isCollapsed ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`ml-auto text-[#1B3A5C]/30 text-2xl font-medium tracking-tight transition-opacity duration-300 ${
              !isMobile && isCollapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {isMobile ? '✕' : '«'}
          </span>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          const collapsed = !isMobile && isCollapsed

          return (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={handleNavClick}
                className={`flex items-center gap-3 rounded-lg transition-all duration-300 ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-brand-100 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={`text-sm whitespace-nowrap transition-opacity duration-300 ${
                    collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>

              {/* Tooltip when collapsed (desktop only) */}
              {collapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 py-3 px-2 space-y-1 shrink-0">
        {/* Guide link */}
        <div className="relative group">
          <NavLink
            to="/guias"
            onClick={handleNavClick}
            className={`flex items-center gap-3 rounded-lg transition-all duration-300 ${
              !isMobile && isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            } ${
              location.pathname === '/guias'
                ? 'bg-brand-100 text-brand-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <BookIcon size={20} className="shrink-0" />
            <span
              className={`text-sm whitespace-nowrap transition-opacity duration-300 ${
                !isMobile && isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              Guias
            </span>
          </NavLink>
          {!isMobile && isCollapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Guias
            </div>
          )}
        </div>

        {/* Professional settings */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              onOpenProfessionalModal()
              if (isMobile) onCloseMobile()
            }}
            className={`w-full flex items-center gap-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-300 ${
              !isMobile && isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            }`}
          >
            <SettingsIcon size={20} className="shrink-0" />
            <span
              className={`text-sm whitespace-nowrap transition-opacity duration-300 ${
                !isMobile && isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              Profissional
            </span>
          </button>
          {!isMobile && isCollapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Profissional
            </div>
          )}
        </div>

        {/* Slogan */}
        <p
          className={`text-xs text-gray-400 whitespace-nowrap text-left pl-3 transition-opacity duration-300 py-1 ${
            !isMobile && isCollapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Pense diferente. Crie melhor
        </p>
      </div>
    </>
  )

  // --- Mobile: drawer overlay ---
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed left-0 top-0 h-dvh w-72 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="navigation"
          aria-label="Menu principal"
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  // --- Desktop: sidebar fixa ---
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
      role="navigation"
      aria-label="Menu principal"
    >
      {sidebarContent}
    </aside>
  )
}
