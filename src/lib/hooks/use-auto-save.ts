import { useRef, useState, useCallback, useEffect } from 'react'

export type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function useAutoSave<T>(
  saveFn: (data: T) => unknown | Promise<unknown>,
  delay = 1000
) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  const scheduleSave = useCallback(
    (data: T) => {
      setSaveStatus('unsaved')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await saveFn(data)
          setSaveStatus('saved')
        } catch {
          setSaveStatus('unsaved')
        }
      }, delay)
    },
    [saveFn, delay]
  )

  const forceSave = useCallback(
    async (data: T) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setSaveStatus('saving')
      try {
        await saveFn(data)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    },
    [saveFn]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return { saveStatus, setSaveStatus, scheduleSave, forceSave }
}
