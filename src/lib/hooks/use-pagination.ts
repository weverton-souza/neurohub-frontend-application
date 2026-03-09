import { useState, useMemo, useCallback } from 'react'
import type { Page } from '@/types'
import { paginate } from '@/lib/utils'

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const page: Page<T> = useMemo(
    () => paginate(items, currentPage, pageSize),
    [items, currentPage, pageSize]
  )

  const changePageSize = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(0)
  }, [])

  const resetPage = useCallback(() => {
    setCurrentPage(0)
  }, [])

  return { page, currentPage, setCurrentPage, pageSize, changePageSize, resetPage }
}
