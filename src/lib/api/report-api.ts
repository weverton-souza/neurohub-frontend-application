import type { Report, ReportVersion, Page } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Report CRUD ==========

export async function getReports(page = 0, size = 25): Promise<Page<Report>> {
  const params = new URLSearchParams({
    pageNumber: String(page),
    pageSize: String(size),
  })
  const { data } = await api.get<Page<Report>>(`/reports?${params}`)
  return data
}

export async function getReport(id: string): Promise<Report> {
  const { data } = await api.get<Report>(`/reports/${id}`)
  return data
}

export async function createReport(report: Partial<Report>): Promise<Report> {
  const { data } = await api.post<Report>('/reports', report)
  return data
}

export async function updateReport(report: Report): Promise<Report> {
  const { data } = await api.put<Report>(`/reports/${report.id}`, report)
  return data
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/reports/${id}`)
}

export async function getReportsByCustomer(customerId: string): Promise<Report[]> {
  const { data } = await api.get<Report[]>(`/reports/customer/${customerId}`)
  return data
}

// ========== Report Versions ==========

export async function getReportVersions(reportId: string): Promise<ReportVersion[]> {
  const { data } = await api.get<ReportVersion[]>(`/reports/${reportId}/versions`)
  return data
}

export async function createReportVersion(
  reportId: string,
  version: { description?: string; type?: string },
): Promise<ReportVersion> {
  const { data } = await api.post<ReportVersion>(`/reports/${reportId}/versions`, version)
  return data
}
