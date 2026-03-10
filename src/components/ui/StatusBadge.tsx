import { ReportStatus, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/types'

interface StatusBadgeProps {
  status: ReportStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text } = REPORT_STATUS_COLORS[status]
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}
