import type { Patient, PatientNote, PatientEvent, Page } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Customer CRUD ==========

export async function getCustomers(
  page = 0,
  size = 25,
  search?: string,
): Promise<Page<Patient>> {
  const params = new URLSearchParams({
    pageNumber: String(page),
    pageSize: String(size),
  })
  if (search) params.set('search', search)
  const { data } = await api.get<Page<Patient>>(`/customers?${params}`)
  return data
}

export async function getCustomer(id: string): Promise<Patient> {
  const { data } = await api.get<Patient>(`/customers/${id}`)
  return data
}

export async function createCustomer(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
  const { data } = await api.post<Patient>('/customers', patient)
  return data
}

export async function updateCustomer(patient: Patient): Promise<Patient> {
  const { data } = await api.put<Patient>(`/customers/${patient.id}`, patient)
  return data
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`)
}

// ========== Customer Notes ==========

export async function getCustomerNotes(customerId: string): Promise<PatientNote[]> {
  const { data } = await api.get<PatientNote[]>(`/customers/${customerId}/notes`)
  return data
}

export async function createCustomerNote(
  customerId: string,
  note: { content: string },
): Promise<PatientNote> {
  const { data } = await api.post<PatientNote>(`/customers/${customerId}/notes`, note)
  return data
}

export async function deleteCustomerNote(customerId: string, noteId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/notes/${noteId}`)
}

// ========== Customer Events ==========

export async function getCustomerEvents(customerId: string): Promise<PatientEvent[]> {
  const { data } = await api.get<PatientEvent[]>(`/customers/${customerId}/events`)
  return data
}

export async function createCustomerEvent(
  customerId: string,
  event: Omit<PatientEvent, 'id' | 'createdAt'>,
): Promise<PatientEvent> {
  const { data } = await api.post<PatientEvent>(`/customers/${customerId}/events`, event)
  return data
}

export async function deleteCustomerEvent(customerId: string, eventId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/events/${eventId}`)
}
