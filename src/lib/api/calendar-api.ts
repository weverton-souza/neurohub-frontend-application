import type { EventTag, CalendarEvent, EventDateTime } from '@/types'
import { api } from '@/lib/api/api-client'

// ========== Event Tags ==========

export async function getEventTags(): Promise<EventTag[]> {
  const { data } = await api.get<EventTag[]>('/event-tags')
  return data
}

export async function createEventTag(tag: { name: string; color: string }): Promise<EventTag> {
  const { data } = await api.post<EventTag>('/event-tags', tag)
  return data
}

export async function updateEventTag(id: string, tag: { name: string; color: string }): Promise<EventTag> {
  const { data } = await api.put<EventTag>(`/event-tags/${id}`, tag)
  return data
}

export async function deleteEventTag(id: string): Promise<void> {
  await api.delete(`/event-tags/${id}`)
}

// ========== Calendar Events ==========

interface CalendarEventRequest {
  summary: string
  description?: string
  location?: string
  start: EventDateTime
  end: EventDateTime
  allDay: boolean
  tagId?: string
  customerId?: string
  status?: string
}

interface CalendarEventRaw {
  id: string
  summary: string
  description?: string
  location?: string
  start: EventDateTime
  end: EventDateTime
  allDay: boolean
  tagId?: string
  tag?: { id: string; name: string; color: string }
  customerId?: string
  customerName?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurrence?: string[]
  reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] }
  googleEventId?: string
  iCalUID?: string
  createdAt: string
  updatedAt: string
}

function mapCalendarEvent(raw: CalendarEventRaw): CalendarEvent {
  return {
    ...raw,
    tagName: raw.tag?.name,
    tagColor: raw.tag?.color,
  }
}

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ from, to })
  const { data } = await api.get<CalendarEventRaw[]>(`/calendar-events?${params}`)
  return data.map(mapCalendarEvent)
}

export async function createCalendarEvent(event: CalendarEventRequest): Promise<CalendarEvent> {
  const { data } = await api.post<CalendarEventRaw>('/calendar-events', event)
  return mapCalendarEvent(data)
}

export async function updateCalendarEvent(id: string, event: CalendarEventRequest): Promise<CalendarEvent> {
  const { data } = await api.put<CalendarEventRaw>(`/calendar-events/${id}`, event)
  return mapCalendarEvent(data)
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await api.delete(`/calendar-events/${id}`)
}
