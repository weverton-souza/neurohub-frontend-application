import type {
  AiGenerationRequest,
  AiGenerationResponse,
  AiUsageSummary,
  AiUsageDetail,
} from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Geração de Seções ==========

export async function generateSection(
  reportId: string,
  request: AiGenerationRequest,
): Promise<AiGenerationResponse> {
  const { data } = await api.post<AiGenerationResponse>(
    `/reports/${reportId}/generate-section`,
    request,
  )
  return data
}

// ========== Consumo ==========

export async function getUsageSummary(
  month?: number,
  year?: number,
): Promise<AiUsageSummary> {
  const now = new Date()
  const params = new URLSearchParams({
    month: String(month ?? now.getMonth() + 1),
    year: String(year ?? now.getFullYear()),
  })
  const { data } = await api.get<AiUsageSummary>(`/ai/usage/summary?${params}`)
  return data
}

export async function getUsageHistory(
  month?: number,
  year?: number,
): Promise<AiUsageDetail[]> {
  const now = new Date()
  const params = new URLSearchParams({
    month: String(month ?? now.getMonth() + 1),
    year: String(year ?? now.getFullYear()),
  })
  const { data } = await api.get<AiUsageDetail[]>(`/ai/usage/history?${params}`)
  return data
}

