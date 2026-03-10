import { useCallback, useState } from 'react'
import type { Report, ReportVersion } from '@/types'
import { REPORT_STATUS_LABELS } from '@/types'
import { getReportVersions, createReportVersion } from '@/lib/api/report-api'

export function useVersioning(report: Report | null) {
  const [versions, setVersions] = useState<ReportVersion[]>([])

  const refreshVersions = useCallback(async () => {
    if (!report) return
    try {
      const v = await getReportVersions(report.id)
      setVersions(v)
    } catch {
      // ignore
    }
  }, [report])

  const createSnapshot = useCallback(
    async (description: string) => {
      if (!report) return
      try {
        await createReportVersion(report.id, { description })
        const v = await getReportVersions(report.id)
        setVersions(v)
      } catch {
        // ignore
      }
    },
    [report]
  )

  const createStatusChangeSnapshot = useCallback(
    (fromStatus: string) => {
      createSnapshot(`Status alterado de ${REPORT_STATUS_LABELS[fromStatus as keyof typeof REPORT_STATUS_LABELS] ?? fromStatus}`)
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
