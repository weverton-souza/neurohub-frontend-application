import { useState, useEffect } from 'react'

interface AiLoadingOverlayProps {
  visible: boolean
  message?: string
}

export default function AiLoadingOverlay({
  visible,
  message = 'Gerando texto com IA...',
}: AiLoadingOverlayProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!visible) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 border-3 border-violet-200 rounded-full" />
          <div className="absolute inset-0 w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-600 font-medium">{message}</p>
        {elapsed > 5 && (
          <p className="text-xs text-gray-400">
            {elapsed > 30 ? 'Ainda processando, aguarde...' : 'Isso pode levar alguns segundos'}
          </p>
        )}
      </div>
    </div>
  )
}
