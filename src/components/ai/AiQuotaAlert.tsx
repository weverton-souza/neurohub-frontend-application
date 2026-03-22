import { useRef } from 'react'

interface AiQuotaAlertProps {
  alertLevel: string | null
  alertMessage: string | null
}

/**
 * Exibe toast de alerta quando o consumo atinge 80% ou 100%.
 * Mostra apenas uma vez por threshold por sessão.
 */
export default function AiQuotaAlert({ alertLevel, alertMessage }: AiQuotaAlertProps) {
  const lastShownRef = useRef<string | null>(null)

  if (!alertLevel || !alertMessage) return null
  if (lastShownRef.current === alertLevel) return null

  lastShownRef.current = alertLevel

  const isWarning = alertLevel === 'WARNING_80'
  const isDanger = alertLevel === 'LIMIT_REACHED' || alertLevel === 'OVERAGE'

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 max-w-sm animate-[slideUp_0.3s_ease-out]
      flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm
      ${isDanger ? 'bg-red-50/95 border-red-200 text-red-800' :
        isWarning ? 'bg-amber-50/95 border-amber-200 text-amber-800' :
        'bg-blue-50/95 border-blue-200 text-blue-800'}
    `}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        {isDanger ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </>
        ) : (
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        )}
      </svg>
      <div>
        <p className="text-sm font-medium">
          {isDanger ? 'Limite atingido' : 'Atenção'}
        </p>
        <p className="text-xs mt-0.5 opacity-80">{alertMessage}</p>
      </div>
    </div>
  )
}
