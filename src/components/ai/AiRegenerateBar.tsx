import AiSparkleIcon from '@/components/ai/AiSparkleIcon'

interface AiRegenerateBarProps {
  onRegenerate: () => void
  regenerationsUsed: number
  maxRegenerations: number
  loading?: boolean
}

export default function AiRegenerateBar({
  onRegenerate,
  regenerationsUsed,
  maxRegenerations,
  loading = false,
}: AiRegenerateBarProps) {
  const remaining = Math.max(0, maxRegenerations - regenerationsUsed)
  const isDisabled = remaining <= 0 || loading

  return (
    <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5">
        <AiSparkleIcon size={14} className="text-violet-500" />
        <span className="text-xs font-medium text-violet-700">Gerado por IA</span>
      </div>

      <div className="flex-1" />

      <span className="text-xs text-violet-500">
        {remaining} de {maxRegenerations} regenerações restantes
      </span>

      <button
        type="button"
        onClick={onRegenerate}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
          ${isDisabled
            ? 'bg-violet-100 text-violet-300 cursor-not-allowed'
            : 'bg-violet-100 text-violet-700 hover:bg-violet-200 active:bg-violet-300'
          }
        `}
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        )}
        Regerar
      </button>
    </div>
  )
}
