import type { ParsedError, ErrorIconType } from '@/lib/api/error-handler'
import Modal from '@/components/ui/Modal'

interface ErrorModalProps {
  error: ParsedError | null
  onClose: () => void
}

function ErrorIcon({ type }: { type: ErrorIconType }) {
  if (type === 'lock') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  }
  if (type === 'warning') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

export default function ErrorModal({ error, onClose }: ErrorModalProps) {
  if (!error) return null

  return (
    <Modal
      isOpen={!!error}
      onClose={onClose}
      title={error.title}
      size="sm"
      accent={{
        colorClass: error.colorClass,
        icon: <ErrorIcon type={error.iconType} />,
      }}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{error.message}</p>

        {error.validationErrors && error.validationErrors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-800 mb-2">Campos com erro:</p>
            <ul className="space-y-1">
              {error.validationErrors.map((ve, i) => (
                <li key={i} className="text-xs text-amber-700">
                  <span className="font-medium">{ve.field}</span>: {ve.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}
