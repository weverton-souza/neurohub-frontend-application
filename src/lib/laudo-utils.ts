import type { Laudo, Patient } from '@/types'
import { createEmptyIdentificationData } from '@/types'
import { createReport } from '@/lib/api/report-api'
import { getProfessional } from '@/lib/api/professional-api'
import { createBlock } from '@/lib/utils'

export async function createLaudoFromPatient(patient: Patient): Promise<Laudo> {
  const professional = await getProfessional()
  const identificationBlock = createBlock('identification', 0, professional)

  const identData = createEmptyIdentificationData(professional)
  identData.patient = { ...patient.data }
  identificationBlock.data = identData

  const laudo: Partial<Laudo> = {
    status: 'rascunho',
    patientName: patient.data.name,
    patientId: patient.id,
    blocks: [identificationBlock],
  }

  return createReport(laudo)
}

export async function createEmptyLaudo(): Promise<Laudo> {
  const professional = await getProfessional()
  const identificationBlock = createBlock('identification', 0, professional)

  const laudo: Partial<Laudo> = {
    status: 'rascunho',
    patientName: '',
    blocks: [identificationBlock],
  }

  return createReport(laudo)
}
