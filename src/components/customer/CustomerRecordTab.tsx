import { useState, useCallback, useMemo } from 'react'
import type { CustomerNote, CustomerEvent } from '@/types'
import { CUSTOMER_EVENT_TYPE_COLORS, getVerticalRecordConfig } from '@/types'
import {
  createCustomerNote,
  getCustomerNotes,
  deleteCustomerNote as apiDeleteCustomerNote,
  createCustomerEvent,
  getCustomerEvents,
  deleteCustomerEvent as apiDeleteCustomerEvent,
} from '@/lib/api/customer-api'
import { createEmptyCustomerEvent } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { useError } from '@/contexts/ErrorContext'
import { useAuth } from '@/contexts/AuthContext'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import Button from '@/components/ui/Button'

// ========== Types ==========

type EntryType = 'note' | 'event'

interface TimelineEntry {
  type: EntryType
  date: string
  note?: CustomerNote
  event?: CustomerEvent
}

interface CustomerRecordTabProps {
  customerId: string
  notes: CustomerNote[]
  events: CustomerEvent[]
  onNotesChange: (notes: CustomerNote[]) => void
  onEventsChange: (events: CustomerEvent[]) => void
}

// ========== Icons ==========

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ========== Helpers ==========

function mergeTimeline(notes: CustomerNote[], events: CustomerEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const note of notes) {
    entries.push({ type: 'note', date: note.createdAt, note })
  }
  for (const event of events) {
    entries.push({ type: 'event', date: event.date, event })
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return entries
}

function groupEntriesByMonth(entries: TimelineEntry[]): { label: string; entries: TimelineEntry[] }[] {
  const groups: Map<string, TimelineEntry[]> = new Map()

  for (const entry of entries) {
    const d = new Date(entry.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, items]) => ({
      label: new Date(items[0].date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      entries: items,
    }))
}

// ========== Component ==========

export default function CustomerRecordTab({ customerId, notes, events, onNotesChange, onEventsChange }: CustomerRecordTabProps) {
  const { showError } = useError()
  const { user } = useAuth()
  const verticalConfig = getVerticalRecordConfig(user?.vertical ?? 'GENERAL')

  // New entry form state
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<EntryType>('event')
  const [noteContent, setNoteContent] = useState('')
  const [newEvent, setNewEvent] = useState<CustomerEvent | null>(null)

  const timeline = useMemo(() => mergeTimeline(notes, events), [notes, events])
  const grouped = useMemo(() => groupEntriesByMonth(timeline), [timeline])

  // ========== Handlers ==========

  const handleOpenForm = useCallback((mode: EntryType) => {
    setFormMode(mode)
    if (mode === 'event') {
      const defaultType = verticalConfig.eventTypes[0]?.value ?? 'observacao'
      setNewEvent(createEmptyCustomerEvent(customerId, defaultType as never))
    }
    setShowForm(true)
  }, [customerId, verticalConfig])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setNoteContent('')
    setNewEvent(null)
  }, [])

  const handleSaveNote = useCallback(async () => {
    if (!noteContent.trim()) return
    try {
      await createCustomerNote(customerId, { content: noteContent.trim() })
      const updated = await getCustomerNotes(customerId)
      onNotesChange(updated)
      handleCloseForm()
    } catch (err) {
      showError(err)
    }
  }, [customerId, noteContent, onNotesChange, handleCloseForm, showError])

  const handleSaveEvent = useCallback(async () => {
    if (!newEvent || !newEvent.title.trim()) return
    try {
      await createCustomerEvent(customerId, newEvent)
      const updated = await getCustomerEvents(customerId)
      onEventsChange(updated)
      handleCloseForm()
    } catch (err) {
      showError(err)
    }
  }, [customerId, newEvent, onEventsChange, handleCloseForm, showError])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await apiDeleteCustomerNote(customerId, noteId)
      const updated = await getCustomerNotes(customerId)
      onNotesChange(updated)
    } catch (err) {
      showError(err)
    }
  }, [customerId, onNotesChange, showError])

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await apiDeleteCustomerEvent(customerId, eventId)
      const updated = await getCustomerEvents(customerId)
      onEventsChange(updated)
    } catch (err) {
      showError(err)
    }
  }, [customerId, onEventsChange, showError])

  // ========== Render ==========

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{verticalConfig.tabName}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenForm('note')}>
            + Nota
          </Button>
          <Button size="sm" onClick={() => handleOpenForm('event')}>
            + Novo Evento
          </Button>
        </div>
      </div>

      {/* New entry form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => { setFormMode('event'); setNewEvent(createEmptyCustomerEvent(customerId, verticalConfig.eventTypes[0]?.value as never)) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${formMode === 'event' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Evento
            </button>
            <button
              onClick={() => setFormMode('note')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${formMode === 'note' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Nota
            </button>
          </div>

          {formMode === 'note' ? (
            <div className="space-y-3">
              <TextArea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escreva uma nota de acompanhamento..."
                className="min-h-[80px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCloseForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveNote} disabled={!noteContent.trim()}>Salvar Nota</Button>
              </div>
            </div>
          ) : newEvent && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Novo evento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  >
                    {verticalConfig.eventTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Data e Hora"
                  type="datetime-local"
                  value={newEvent.date.slice(0, 16)}
                  onChange={(e) => setNewEvent({ ...newEvent, date: new Date(e.target.value).toISOString() })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Título"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Ex: Primeira consulta de avaliação"
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextArea
                    label="Descrição (opcional)"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Observações sobre o evento..."
                    className="min-h-[60px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCloseForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveEvent} disabled={!newEvent.title.trim()}>Salvar Evento</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {timeline.length === 0 && !showForm && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Nenhum registro</p>
          <p className="text-xs text-gray-500 mt-1">Adicione eventos e notas para acompanhar o progresso</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => handleOpenForm('note')}>Adicionar nota</Button>
            <Button variant="ghost" size="sm" onClick={() => handleOpenForm('event')}>Registrar evento</Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <ol className="relative border-l-2 border-gray-200 ml-3">
                {group.entries.map((entry) => {
                  if (entry.type === 'note' && entry.note) {
                    return renderNoteEntry(entry.note)
                  }
                  if (entry.type === 'event' && entry.event) {
                    return renderEventEntry(entry.event)
                  }
                  return null
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ========== Entry Renderers ==========

  function renderNoteEntry(note: CustomerNote) {
    return (
      <li key={`note-${note.id}`} className="mb-6 ml-6 group">
        <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-gray-300 ring-4 ring-white" />

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-gray-100">
                  <NoteIcon />
                  Nota
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(note.createdAt)}
                  {note.updatedAt !== note.createdAt && <span className="ml-1 text-gray-300">(editado)</span>}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{note.content}</p>
            </div>

            <button
              onClick={() => handleDeleteNote(note.id)}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Excluir nota"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </li>
    )
  }

  function renderEventEntry(event: CustomerEvent) {
    const dotColor = CUSTOMER_EVENT_TYPE_COLORS[event.type] ?? 'bg-gray-400'
    const typeLabel = verticalConfig.eventTypes.find((t) => t.value === event.type)?.label ?? event.type
    const eventDate = new Date(event.date)
    const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const dateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    return (
      <li key={`event-${event.id}`} className="mb-6 ml-6 group">
        <span className={`absolute -left-[9px] w-4 h-4 rounded-full ${dotColor} ring-4 ring-white`} />

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white ${dotColor}`}>
                  {typeLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {dateStr} &agrave;s {timeStr}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
              {event.description && (
                <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed">{event.description}</p>
              )}
            </div>

            <button
              onClick={() => handleDeleteEvent(event.id)}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Excluir evento"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </li>
    )
  }
}
