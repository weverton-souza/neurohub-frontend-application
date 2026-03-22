import AiSparkleIcon from '@/components/ai/AiSparkleIcon'

interface AiGenerateButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  disabledReason?: string
  size?: 'sm' | 'md'
}

export default function AiGenerateButton({
  onClick,
  loading = false,
  disabled = false,
  disabledReason,
  size = 'sm',
}: AiGenerateButtonProps) {
  const isDisabled = disabled || loading

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? (disabledReason || 'IA indisponível') : 'Gerar com IA'}
      className={`
        inline-flex items-center ${sizeClasses} rounded-lg font-medium transition-all
        ${isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow-md active:scale-[0.97]'
        }
      `}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <AiSparkleIcon size={14} />
      )}
      {loading ? 'Gerando...' : 'Gerar com IA'}
    </button>
  )
}
