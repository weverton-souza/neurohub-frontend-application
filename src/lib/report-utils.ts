import type { Report, Customer } from '@/types'
import { createEmptyIdentificationData } from '@/types'
import { createReport } from '@/lib/api/report-api'
import { getProfessional } from '@/lib/api/professional-api'
import { createBlock } from '@/lib/utils'

export async function createReportFromCustomer(customer: Customer): Promise<Report> {
  const professional = await getProfessional()
  const identificationBlock = createBlock('identification', 0, professional)

  const identData = createEmptyIdentificationData(professional)
  identData.customer = { ...customer.data }
  identificationBlock.data = identData

  const report: Partial<Report> = {
    status: 'rascunho',
    customerName: customer.data.name,
    customerId: customer.id,
    blocks: [identificationBlock],
  }

  return createReport(report)
}

export async function createEmptyReport(): Promise<Report> {
  const professional = await getProfessional()
  const identificationBlock = createBlock('identification', 0, professional)

  const report: Partial<Report> = {
    status: 'rascunho',
    customerName: '',
    blocks: [identificationBlock],
  }

  return createReport(report)
}
