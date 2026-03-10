import type { LaudoTemplate, ScoreTableTemplate, ChartTemplate } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Report Templates ==========

export async function getReportTemplates(): Promise<LaudoTemplate[]> {
  const { data } = await api.get<LaudoTemplate[]>('/templates/reports')
  return data
}

export async function createReportTemplate(template: Partial<LaudoTemplate>): Promise<LaudoTemplate> {
  const { data } = await api.post<LaudoTemplate>('/templates/reports', template)
  return data
}

export async function deleteReportTemplate(id: string): Promise<void> {
  await api.delete(`/templates/reports/${id}`)
}

// ========== Score Table Templates ==========

export async function getScoreTableTemplates(): Promise<ScoreTableTemplate[]> {
  const { data } = await api.get<ScoreTableTemplate[]>('/templates/score-tables')
  return data
}

export async function createScoreTableTemplate(
  template: Partial<ScoreTableTemplate>,
): Promise<ScoreTableTemplate> {
  const { data } = await api.post<ScoreTableTemplate>('/templates/score-tables', template)
  return data
}

export async function deleteScoreTableTemplate(id: string): Promise<void> {
  await api.delete(`/templates/score-tables/${id}`)
}

// ========== Chart Templates ==========

export async function getChartTemplates(): Promise<ChartTemplate[]> {
  const { data } = await api.get<ChartTemplate[]>('/templates/charts')
  return data
}

export async function createChartTemplate(template: Partial<ChartTemplate>): Promise<ChartTemplate> {
  const { data } = await api.post<ChartTemplate>('/templates/charts', template)
  return data
}

export async function deleteChartTemplate(id: string): Promise<void> {
  await api.delete(`/templates/charts/${id}`)
}
