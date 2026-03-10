import { useCallback, useState } from 'react'
import type { Laudo, LaudoVersion } from '@/types'
import { LAUDO_STATUS_LABELS } from '@/types'
import { getReportVersions, createReportVersion } from '@/lib/api/report-api'

export function useVersioning(laudo: Laudo | null) {
  const [versions, setVersions] = useState<LaudoVersion[]>([])

  const refreshVersions = useCallback(async () => {
    if (!laudo) return
    try {
      const v = await getReportVersions(laudo.id)
      setVersions(v)
    } catch {
      // ignore
    }
  }, [laudo])

  const createSnapshot = useCallback(
    async (description: string) => {
      if (!laudo) return
      try {
        await createReportVersion(laudo.id, { description })
        const v = await getReportVersions(laudo.id)
        setVersions(v)
      } catch {
        // ignore
      }
    },
    [laudo]
  )

  const createStatusChangeSnapshot = useCallback(
    (fromStatus: string) => {
      createSnapshot(`Status alterado de ${LAUDO_STATUS_LABELS[fromStatus as keyof typeof LAUDO_STATUS_LABELS] ?? fromStatus}`)
    },
    [createSnapshot]
  )

  const createExportSnapshot = useCallback(
    (format: string) => {
      createSnapshot(`Exportação ${format}`)
    },
    [createSnapshot]
  )

  const createManualSnapshot = useCallback(() => {
    createSnapshot('Versão salva manualmente')
  }, [createSnapshot])

  return {
    versions,
    refreshVersions,
    createSnapshot,
    createStatusChangeSnapshot,
    createExportSnapshot,
    createManualSnapshot,
  }
}
