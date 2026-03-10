import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalAccent {
  colorClass: string
  icon?: React.ReactNode
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  accent?: ModalAccent
}

// Default widths (px) per size key
const defaultWidths: Record<string, number> = {
  sm: 384,
  md: 672,
  lg: 896,
  xl: 1024,
  '2xl': 1152,
}

const MIN_WIDTH = 360
const MIN_HEIGHT = 300

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', accent }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [customSize, setCustomSize] = useState<{ w: number; h: number } | null>(null)
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Reset custom size when modal closes or size prop changes
  useEffect(() => {
    if (!isOpen) setCustomSize(null)
  }, [isOpen])

  // --- Drag resize from bottom-right corner ---
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const panel = panelRef.current
    if (!panel) return
    dragging.current = true
    const rect = panel.getBoundingClientRect()
    startPos.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    const maxW = window.innerWidth - 32
    const maxH = window.innerHeight - 32
    const newW = Math.min(maxW, Math.max(MIN_WIDTH, startPos.current.w + dx))
    const newH = Math.min(maxH, Math.max(MIN_HEIGHT, startPos.current.h + dy))
    setCustomSize({ w: newW, h: newH })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // Double-click on resize handle: reset to default
  const onDoubleClick = useCallback(() => {
    setCustomSize(null)
  }, [])

  if (!isOpen) return null

  const inlineStyle: React.CSSProperties = customSize
    ? { width: customSize.w, maxWidth: '95vw', height: customSize.h, maxHeight: '95vh' }
    : {}

  const panelClassName = customSize
    ? 'bg-white rounded-xl shadow-xl overflow-hidden flex flex-col'
    : `bg-white rounded-xl shadow-xl overflow-hidden flex flex-col w-full max-h-[90vh] ${defaultWidths[size] ? '' : ''}` // max-w via Tailwind below

  // When no custom size, use Tailwind max-w classes
  const tailwindMaxW = !customSize
    ? (size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-2xl' : size === 'lg' ? 'max-w-4xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-6xl')
    : ''

  const closeButton = (
    <button
      onClick={onClose}
      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label="Fechar"
      title="Fechar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        style={inlineStyle}
        className={`${panelClassName} ${tailwindMaxW} relative`}
      >
        {/* Header */}
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {accent && (
                <div className={`p-1.5 rounded-lg shrink-0 ${accent.colorClass}`}>
                  {accent.icon}
                </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              {closeButton}
            </div>
          </div>
        ) : (
          <div className="flex justify-end px-6 pt-4 shrink-0">
            {closeButton}
          </div>
        )}

        {/* Scrollable content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3 border-t border-gray-200 shrink-0">{footer}</div>
        )}

        {/* Resize handle — bottom-right corner */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onDoubleClick}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize group/handle z-20"
          title="Arraste para redimensionar (duplo-clique para restaurar)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="absolute bottom-1 right-1 text-gray-300 group-hover/handle:text-gray-500 transition-colors"
          >
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11" y1="5" x2="5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11" y1="9" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal
