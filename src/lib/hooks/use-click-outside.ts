import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, onClose, enabled])
}
