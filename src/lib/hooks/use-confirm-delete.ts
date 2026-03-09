import { useState, useCallback } from 'react'

export function useConfirmDelete(deleteFn: (id: string) => void | Promise<void>) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const requestDelete = useCallback((id: string) => {
    setConfirmId(id)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!confirmId) return
    await deleteFn(confirmId)
    setConfirmId(null)
  }, [confirmId, deleteFn])

  const cancelDelete = useCallback(() => {
    setConfirmId(null)
  }, [])

  return { confirmId, requestDelete, confirmDelete, cancelDelete }
}
