import { useState, useCallback, useRef } from 'react'
import type { AiGenerationResponse, AiUsageSummary } from '@/types'
import { generateSection, getUsageSummary } from '@/lib/api/ai-api'
import { ApiError } from '@/lib/api/api-client'

export type AiGenerationStatus = 'idle' | 'loading' | 'success' | 'error' | 'quota-exceeded'

interface UseAiGenerationReturn {
  status: AiGenerationStatus
  error: string | null

  generate: (reportId: string, sectionType: string, formResponseId?: string, customerId?: string) => Promise<AiGenerationResponse | null>
  reset: () => void

  usage: AiUsageSummary | null
  refreshUsage: () => Promise<void>
  isLoadingUsage: boolean
}

export function useAiGeneration(): UseAiGenerationReturn {
  const [status, setStatus] = useState<AiGenerationStatus>('idle')
  const [, setGeneratedText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setGenerationId] = useState<string | null>(null)
  const [, setTokensUsed] = useState(0)
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(false)
  const abortRef = useRef(false)

  const generate = useCallback(async (
    reportId: string,
    sectionType: string,
    formResponseId?: string,
    customerId?: string,
  ): Promise<AiGenerationResponse | null> => {
    abortRef.current = false
    setStatus('loading')
    setError(null)
    setGeneratedText(null)
    setGenerationId(null)
    setTokensUsed(0)

    try {
      const result = await generateSection(reportId, {
        sectionType,
        formResponseId,
        customerId,
      })

      if (abortRef.current) return null

      setGeneratedText(result.text)
      setGenerationId(result.generationId)
      setTokensUsed(result.tokensUsed)
      setStatus('success')
      return result
    } catch (err) {
      if (abortRef.current) return null

      if (err instanceof ApiError) {
        const errorCode = err.problemDetail.properties?.errorCode
        if (errorCode === 'QUOTA_EXCEEDED' || err.message.includes('franquia')) {
          setStatus('quota-exceeded')
          setError('Franquia mensal atingida. Gerações adicionais serão cobradas como excedente.')
          return null
        }
      }

      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar texto com IA. Tente novamente.',
      )
      return null
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current = true
    setStatus('idle')
    setGeneratedText(null)
    setError(null)
    setGenerationId(null)
    setTokensUsed(0)
  }, [])

  const refreshUsage = useCallback(async () => {
    setIsLoadingUsage(true)
    try {
      const summary = await getUsageSummary()
      setUsage(summary)
    } catch {
      // silently fail — usage is informational
    } finally {
      setIsLoadingUsage(false)
    }
  }, [])

  return {
    status,
    error,
    generate,
    reset,
    usage,
    refreshUsage,
    isLoadingUsage,
  }
}
