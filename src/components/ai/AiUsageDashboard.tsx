import { useState, useEffect } from 'react'
import type { AiUsageSummary, AiUsageDetail } from '@/types'
import { getUsageSummary, getUsageHistory } from '@/lib/api/ai-api'
import Modal from '@/components/ui/Modal'

interface AiUsageDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function AiUsageDashboard({ isOpen, onClose }: AiUsageDashboardProps) {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [history, setHistory] = useState<AiUsageDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([getUsageSummary(), getUsageHistory()])
      .then(([summary, hist]) => {
        setUsage(summary)
        setHistory(hist)
      })
      .catch(() => { /* silently fail */ })
      .finally(() => setLoading(false))
  }, [isOpen])

  const percentage = usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0
  const barColor =
    percentage >= 100 ? 'bg-red-500' :
    percentage >= 80 ? 'bg-amber-500' :
    'bg-violet-500'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Consumo de IA" size="lg">
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usage ? (
          <>
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Laudos gerados este mês</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usage.used} <span className="text-base font-normal text-gray-400">/ {usage.limit}</span>
                  </p>
                </div>
                {usage.tierName && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    {usage.tierName.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Alert */}
              {usage.alertMessage && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  usage.alertLevel === 'OVERAGE' ? 'bg-red-50 text-red-700 border border-red-200' :
                  usage.alertLevel === 'LIMIT_REACHED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{usage.alertMessage}</span>
                </div>
              )}

              {/* Overage info */}
              {usage.overage > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600">Excedente</span>
                  <span className="font-medium text-gray-900">
                    {usage.overage} laudos (R${(usage.overageCostCents / 100).toFixed(2)})
                  </span>
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Histórico de gerações</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        item.status === 'SUCCESS' ? 'bg-green-500' :
                        item.status === 'ERROR' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{item.sectionType}</p>
                        <p className="text-[10px] text-gray-400">
                          {item.inputTokens + item.outputTokens} tokens · R${item.estimatedCostBrl.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {item.isRegeneration && (
                          <span className="text-[10px] text-violet-500">regen</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Não foi possível carregar dados de consumo.</p>
        )}
      </div>
    </Modal>
  )
}
