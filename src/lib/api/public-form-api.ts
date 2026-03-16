import axios from 'axios'
import { API_BASE_URL } from './api-client'
import type { PublicFormData, FormFieldAnswer } from '@/types'

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export async function getPublicForm(token: string): Promise<PublicFormData> {
  const { data } = await publicApi.get<PublicFormData>(`/public/forms/${token}`)
  return data
}

export async function submitPublicForm(
  token: string,
  customerName: string,
  answers: FormFieldAnswer[],
): Promise<void> {
  await publicApi.post(`/public/forms/${token}/submit`, { customerName, answers })
}
