import { api } from './api-client'
import type { FormLink } from '@/types'

export async function createFormLink(
  formId: string,
  customerId: string,
  expiresInHours: number = 72,
): Promise<FormLink> {
  const { data } = await api.post<FormLink>('/form-links', { formId, customerId, expiresInHours })
  return data
}
