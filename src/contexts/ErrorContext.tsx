import { createContext, useContext, useState, useCallback } from 'react'
import { parseError } from '@/lib/api/error-handler'
import type { ParsedError } from '@/lib/api/error-handler'
import ErrorModal from '@/components/ui/ErrorModal'

interface ErrorContextValue {
  showError: (error: unknown) => void
  clearError: () => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

export function useError(): ErrorContextValue {
  const ctx = useContext(ErrorContext)
  if (!ctx) throw new Error('useError must be used within ErrorProvider')
  return ctx
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [currentError, setCurrentError] = useState<ParsedError | null>(null)

  const showError = useCallback((error: unknown) => {
    const parsed = parseError(error)
    // Erros de auth são tratados pelo interceptor (redirect automático) — não mostra modal
    if (parsed.isAuthError) return
    setCurrentError(parsed)
  }, [])

  const clearError = useCallback(() => {
    setCurrentError(null)
  }, [])

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      <ErrorModal
        error={currentError}
        onClose={clearError}
      />
    </ErrorContext.Provider>
  )
}
