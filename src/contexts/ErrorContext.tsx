import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  const showError = useCallback((error: unknown) => {
    const parsed = parseError(error)
    setCurrentError(parsed)
  }, [])

  const clearError = useCallback(() => {
    setCurrentError(null)
  }, [])

  const handleGoToLogin = useCallback(() => {
    setCurrentError(null)
    navigate('/login')
  }, [navigate])

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      <ErrorModal
        error={currentError}
        onClose={clearError}
        onGoToLogin={handleGoToLogin}
      />
    </ErrorContext.Provider>
  )
}
