import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMediaQuery } from '@/lib/hooks/use-media-query'

const STORAGE_KEY = 'dox_sidebar_collapsed'

export function useSidebar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()

  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const openMobile = useCallback(() => setIsMobileOpen(true), [])
  const closeMobile = useCallback(() => setIsMobileOpen(false), [])

  // Fechar drawer ao navegar
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Fechar drawer se redimensionar para desktop
  useEffect(() => {
    if (isDesktop) setIsMobileOpen(false)
  }, [isDesktop])

  return {
    isCollapsed,
    toggle,
    isMobile: !isDesktop,
    isMobileOpen,
    openMobile,
    closeMobile,
  }
}
