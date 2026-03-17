import { useMemo } from 'react'
import type { FormField, FormSectionGroup } from '@/types'
import { buildFormSectionGroups } from '@/lib/utils'

export function useSortedFields(fields: FormField[] | undefined) {
  const sortedFields = useMemo(
    () => fields ? [...fields].sort((a, b) => a.order - b.order) : [],
    [fields],
  )

  const sectionGroups: FormSectionGroup[] = useMemo(
    () => buildFormSectionGroups(sortedFields),
    [sortedFields],
  )

  return { sortedFields, sectionGroups }
}
