import type { Professional } from '@/types'
import { api } from '@/lib/api/api-client'

export async function getProfessional(): Promise<Professional> {
  const { data } = await api.get<Professional>('/professional')
  return {
    ...data,
    name: data.name ?? '',
    specialization: data.specialization ?? '',
    phone: data.phone ?? '',
    instagram: data.instagram ?? '',
    email: data.email ?? '',
  }
}

export async function updateProfessional(professional: Partial<Professional>): Promise<Professional> {
  const { data } = await api.put<Professional>('/professional', professional)
  return data
}
