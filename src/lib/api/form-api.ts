import type { AnamnesisForm, FormResponse } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Forms CRUD ==========

export async function listForms(): Promise<AnamnesisForm[]> {
  const { data } = await api.get<AnamnesisForm[]>('/forms')
  return data
}

export async function getFormById(id: string): Promise<AnamnesisForm> {
  const { data } = await api.get<AnamnesisForm>(`/forms/${id}`)
  return data
}

export async function createForm(form: Partial<AnamnesisForm>): Promise<AnamnesisForm> {
  const { data } = await api.post<AnamnesisForm>('/forms', form)
  return data
}

export async function updateForm(form: AnamnesisForm): Promise<AnamnesisForm> {
  const { data } = await api.put<AnamnesisForm>(`/forms/${form.id}`, form)
  return data
}

export async function deleteForm(id: string): Promise<void> {
  await api.delete(`/forms/${id}`)
}

// ========== Form Responses CRUD ==========

export async function listFormResponses(formId: string): Promise<FormResponse[]> {
  const { data } = await api.get<FormResponse[]>(`/forms/${formId}/responses`)
  return data
}

export async function getFormResponseById(formId: string, responseId: string): Promise<FormResponse> {
  const { data } = await api.get<FormResponse>(`/forms/${formId}/responses/${responseId}`)
  return data
}

export async function createFormResponse(
  formId: string,
  response: Partial<FormResponse>,
): Promise<FormResponse> {
  const { data } = await api.post<FormResponse>(`/forms/${formId}/responses`, response)
  return data
}

export async function updateFormResponse(
  formId: string,
  response: FormResponse,
): Promise<FormResponse> {
  const { data } = await api.put<FormResponse>(
    `/forms/${formId}/responses/${response.id}`,
    response,
  )
  return data
}

export async function deleteFormResponse(formId: string, responseId: string): Promise<void> {
  await api.delete(`/forms/${formId}/responses/${responseId}`)
}
