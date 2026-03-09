import type { Laudo, Patient } from '@/types'
import { createEmptyIdentificationData } from '@/types'
import { saveLaudo, getProfessional } from '@/lib/storage'
import { createBlock } from '@/lib/utils'

export function createLaudoFromPatient(patient: Patient): Laudo {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const identificationBlock = createBlock('identification', 0)

  const professional = getProfessional()
  const identData = createEmptyIdentificationData(professional)
  identData.patient = { ...patient.data }
  identificationBlock.data = identData

  const laudo: Laudo = {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'rascunho',
    patientName: patient.data.name,
    patientId: patient.id,
    blocks: [identificationBlock],
  }

  saveLaudo(laudo)
  return laudo
}

export function createEmptyLaudo(): Laudo {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const identificationBlock = createBlock('identification', 0)

  const laudo: Laudo = {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'rascunho',
    patientName: '',
    blocks: [identificationBlock],
  }

  saveLaudo(laudo)
  return laudo
}
