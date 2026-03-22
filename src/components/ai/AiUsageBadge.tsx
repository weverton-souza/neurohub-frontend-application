import { useState, useEffect, useCallback } from 'react'
import AiSparkleIcon from '@/components/ai/AiSparkleIcon'
import type { AiUsageSummary } from '@/types'
import { getUsageSummary } from '@/lib/api/ai-api'

interface AiUsageBadgeProps {
  onClick?: () => void
}

export default function AiUsageBadge({ onClick }: AiUsageBadgeProps) {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getUsageSummary()
      setUsage(data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!usage || usage.limit === 0) return null

  const percentage = usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0
  const colorClass =
    percentage >= 100 ? 'text-red-600 bg-red-50 border-red-200' :
    percentage >= 80 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-violet-600 bg-violet-50 border-violet-200'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors hover:opacity-80 ${colorClass}`}
      title="Consumo de IA — clique para detalhes"
    >
      <AiSparkleIcon size={12} />
      {usage.used}/{usage.limit}
    </button>
  )
}
