import type { Laudo, LaudoVersion, Page } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Report CRUD ==========

export async function getReports(page = 0, size = 25): Promise<Page<Laudo>> {
  const params = new URLSearchParams({
    pageNumber: String(page),
    pageSize: String(size),
  })
  const { data } = await api.get<Page<Laudo>>(`/reports?${params}`)
  return data
}

export async function getReport(id: string): Promise<Laudo> {
  const { data } = await api.get<Laudo>(`/reports/${id}`)
  return data
}

export async function createReport(laudo: Partial<Laudo>): Promise<Laudo> {
  const { data } = await api.post<Laudo>('/reports', laudo)
  return data
}

export async function updateReport(laudo: Laudo): Promise<Laudo> {
  const { data } = await api.put<Laudo>(`/reports/${laudo.id}`, laudo)
  return data
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/reports/${id}`)
}

export async function getReportsByCustomer(customerId: string): Promise<Laudo[]> {
  const { data } = await api.get<Laudo[]>(`/reports/customer/${customerId}`)
  return data
}

// ========== Report Versions ==========

export async function getReportVersions(reportId: string): Promise<LaudoVersion[]> {
  const { data } = await api.get<LaudoVersion[]>(`/reports/${reportId}/versions`)
  return data
}

export async function createReportVersion(
  reportId: string,
  version: { description?: string; type?: string },
): Promise<LaudoVersion> {
  const { data } = await api.post<LaudoVersion>(`/reports/${reportId}/versions`, version)
  return data
}
