import { useState, useEffect, useMemo, useCallback } from 'react'
import type { CalendarEvent, EventTag, CustomerCalendarEvent } from '@/types'
import { getAllCustomerEvents, updateCustomerEvent, deleteCustomerEvent } from '@/lib/api/customer-api'
import {
  getCalendarEvents,
  getEventTags,
  createEventTag,
  updateEventTag,
  deleteEventTag,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/api/calendar-api'
import { useAuth } from '@/contexts/AuthContext'
import { useError } from '@/contexts/ErrorContext'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import DotPattern from '@/components/ui/DotPattern'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import TagPicker from '@/components/calendar/TagPicker'
import EventTagModal from '@/components/calendar/EventTagModal'
import CreateEventModal from '@/components/calendar/CreateEventModal'
import type { CreateEventPayload } from '@/components/calendar/CreateEventModal'

const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MAX_VISIBLE_EVENTS = 3

type CalendarView = 'month' | 'week' | 'day'

interface UnifiedEvent {
  id: string
  source: 'calendar' | 'record'
  title: string
  dateKey: string
  dateTime: Date
  color: string
  tagName?: string
  customerName?: string
  calendarEvent?: CalendarEvent
  recordEvent?: CustomerCalendarEvent
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: UnifiedEvent[]
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  const dates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function Calendar() {
  const { user } = useAuth()
  const { showError } = useError()
  const routerNavigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [recordEvents, setRecordEvents] = useState<CustomerCalendarEvent[]>([])
  const [tags, setTags] = useState<EventTag[]>([])

  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set())

  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<EventTag | null>(null)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [clickedDate, setClickedDate] = useState<Date | null>(null)
  const [viewingRecord, setViewingRecord] = useState<CustomerCalendarEvent | null>(null)
  const [reopenEventModal, setReopenEventModal] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = useMemo(() => new Date(), [])

  const loadTags = useCallback(async () => {
    try {
      const data = await getEventTags()
      setTags(data)
      setActiveTagFilters((prev) => {
        const next = new Set(prev)
        for (const tag of data) {
          if (!next.has(tag.id)) next.add(tag.id)
        }
        return next
      })
    } catch (err) {
      showError(err)
    }
  }, [showError])

  useEffect(() => { loadTags() }, [loadTags])

  useEffect(() => {
    const from = new Date(year, month - 1, 1).toISOString()
    const to = new Date(year, month + 2, 0).toISOString()
    getCalendarEvents(from, to).then(setCalendarEvents).catch(showError)
    getAllCustomerEvents(from, to).then(setRecordEvents).catch(showError)
  }, [year, month, showError])

  const unifiedEvents = useMemo(() => {
    const events: UnifiedEvent[] = []
    for (const ce of calendarEvents) {
      if (ce.tagId && !activeTagFilters.has(ce.tagId)) continue
      const dt = ce.allDay
        ? new Date(ce.start.date + 'T00:00:00')
        : new Date(ce.start.dateTime ?? ce.start.date ?? '')
      events.push({
        id: `cal-${ce.id}`, source: 'calendar', title: ce.summary,
        dateKey: toDateKey(dt), dateTime: dt, color: ce.tagColor ?? '#007AFF',
        tagName: ce.tagName, customerName: ce.customerName, calendarEvent: ce,
      })
    }
    for (const re of recordEvents) {
      const dt = new Date(re.date)
      const matchedTag = tags.find((t) => t.name.toLowerCase() === re.type.toLowerCase())
      events.push({
        id: `rec-${re.id}`, source: 'record', title: re.title,
        dateKey: toDateKey(dt), dateTime: dt,
        color: matchedTag?.color ?? '#8E8E93',
        tagName: matchedTag?.name ?? re.type,
        customerName: re.customerName, recordEvent: re,
      })
    }
    return events
  }, [calendarEvents, recordEvents, activeTagFilters, tags])

  const eventsByDate = useMemo(() => {
    const map: Map<string, UnifiedEvent[]> = new Map()
    for (const event of unifiedEvents) {
      if (!map.has(event.dateKey)) map.set(event.dateKey, [])
      map.get(event.dateKey)!.push(event)
    }
    for (const [, dayEvents] of map) {
      dayEvents.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    }
    return map
  }, [unifiedEvents])

  const navigate = useCallback((delta: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (view === 'month') next.setMonth(next.getMonth() + delta)
      else if (view === 'week') next.setDate(next.getDate() + delta * 7)
      else next.setDate(next.getDate() + delta)
      return next
    })
    setExpandedDay(null)
  }, [view])

  const goToToday = useCallback(() => { setCurrentDate(new Date()); setExpandedDay(null) }, [])
  const toggleTagFilter = useCallback((id: string) => {
    setActiveTagFilters((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const handleSaveTag = async (tagData: { name: string; color: string }) => {
    try {
      if (editingTag) {
        const updated = await updateEventTag(editingTag.id, tagData)
        setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } else {
        const created = await createEventTag(tagData)
        setTags((prev) => [...prev, created])
        setActiveTagFilters((prev) => new Set([...prev, created.id]))
      }
    } catch (err) {
      showError(err)
      throw err
    }
  }
  const handleDeleteTag = async (id: string) => {
    try {
      await deleteEventTag(id)
      setTags((prev) => prev.filter((t) => t.id !== id))
      setActiveTagFilters((prev) => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      showError(err)
      throw err
    }
  }
  const handleSaveEvent = async (payload: CreateEventPayload) => {
    try {
      const request = {
        summary: payload.summary, description: payload.description, location: payload.location,
        allDay: payload.allDay,
        start: payload.allDay ? { date: payload.startDate } : { dateTime: payload.startDateTime, timeZone: payload.startTimeZone },
        end: payload.allDay ? { date: payload.endDate } : { dateTime: payload.endDateTime, timeZone: payload.endTimeZone },
        tagId: payload.tagId, customerId: payload.customerId, status: payload.status,
      }
      if (editingEvent) {
        const updated = await updateCalendarEvent(editingEvent.id, request)
        setCalendarEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      } else {
        const created = await createCalendarEvent(request)
        setCalendarEvents((prev) => [...prev, created])
      }
    } catch (err) {
      showError(err)
      throw err
    }
  }
  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteCalendarEvent(id)
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      showError(err)
      throw err
    }
  }

  const openNewEvent = (date?: Date) => { setEditingEvent(null); setClickedDate(date ?? null); setEventModalOpen(true) }
  const openEditEvent = (event: CalendarEvent) => { setEditingEvent(event); setClickedDate(null); setEventModalOpen(true) }
  const openNewTag = () => {
    setEditingTag(null)
    if (eventModalOpen) setReopenEventModal(true)
    setEventModalOpen(false)
    setTagModalOpen(true)
  }
  const openEditTag = (tag: EventTag) => {
    setEditingTag(tag)
    setEventModalOpen(false)
    setTagModalOpen(true)
  }
  const handleEventClick = (event: UnifiedEvent) => {
    if (event.source === 'calendar' && event.calendarEvent) {
      openEditEvent(event.calendarEvent)
    } else if (event.source === 'record' && event.recordEvent) {
      setViewingRecord(event.recordEvent)
    }
  }

  const monthDays: CalendarDay[] = useMemo(() => {
    return getMonthGrid(year, month).map((date) => ({
      date, isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today), events: eventsByDate.get(toDateKey(date)) ?? [],
    }))
  }, [year, month, today, eventsByDate])

  const weekDays: CalendarDay[] = useMemo(() => {
    return getWeekDates(currentDate).map((date) => ({
      date, isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today), events: eventsByDate.get(toDateKey(date)) ?? [],
    }))
  }, [currentDate, month, today, eventsByDate])

  const dayEvents: UnifiedEvent[] = useMemo(() => eventsByDate.get(toDateKey(currentDate)) ?? [], [currentDate, eventsByDate])

  const headerTitle = useMemo(() => {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`
    if (view === 'week') {
      const dates = getWeekDates(currentDate)
      const f = dates[0], l = dates[6]
      if (f.getMonth() === l.getMonth()) return `${f.getDate()} – ${l.getDate()} de ${MONTH_NAMES[f.getMonth()]} ${f.getFullYear()}`
      return `${f.getDate()} ${MONTH_NAMES[f.getMonth()].slice(0, 3)} – ${l.getDate()} ${MONTH_NAMES[l.getMonth()].slice(0, 3)} ${l.getFullYear()}`
    }
    return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }, [view, currentDate, month, year])

  const totalEventsCount = useMemo(() => unifiedEvents.length, [unifiedEvents])

  return (
    <DotPattern className="min-h-[calc(100vh)] flex flex-col">
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
                >
                  <ChevronLeftIcon size={18} />
                </button>
                <button
                  onClick={() => navigate(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
                >
                  <ChevronRightIcon size={18} />
                </button>
              </div>
              <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">{headerTitle}</h1>
              <button
                onClick={goToToday}
                className="ml-2 px-2.5 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5">
                {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all ${
                      view === v
                        ? 'bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <Button size="sm" onClick={() => openNewEvent()}>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
                  Agendar
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-3 flex-wrap">
            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {tags.map((tag) => {
                  const isActive = activeTagFilters.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      onDoubleClick={() => openEditTag(tag)}
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-gray-100 text-gray-700'
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                      title="Clique para filtrar, duplo-clique para editar"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${isActive ? '' : 'opacity-30'}`}
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  )
                })}
                <button onClick={openNewTag} className="text-[11px] text-brand-500 hover:text-brand-600 font-medium ml-0.5 transition-colors">
                  +
                </button>
              </div>
            )}

            {tags.length === 0 && (
              <button onClick={openNewTag} className="text-[11px] text-brand-500 hover:text-brand-600 font-medium transition-colors">
                + Nova tag
              </button>
            )}

            {totalEventsCount > 0 && (
              <>
                <div className="w-px h-3.5 bg-gray-200" />
                <span className="text-[11px] text-gray-400">{totalEventsCount} evento{totalEventsCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          {view === 'month' && <MonthView days={monthDays} expandedDay={expandedDay} setExpandedDay={setExpandedDay} onDayClick={openNewEvent} onEventClick={handleEventClick} />}
          {view === 'week' && <WeekView days={weekDays} onDayClick={openNewEvent} onEventClick={handleEventClick} />}
          {view === 'day' && <DayView events={dayEvents} onEventClick={handleEventClick} />}
        </div>
      </div>

      <CreateEventModal
        isOpen={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setEditingEvent(null); setClickedDate(null) }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        tags={tags}
        onNewTag={openNewTag}
        event={editingEvent}
        initialDate={clickedDate}
      />
      <EventTagModal
        isOpen={tagModalOpen}
        onClose={() => {
          setTagModalOpen(false)
          setEditingTag(null)
          if (reopenEventModal) {
            setReopenEventModal(false)
            setEventModalOpen(true)
          }
        }}
        onSave={handleSaveTag}
        onDelete={editingTag ? handleDeleteTag : undefined}
        tag={editingTag}
        existingColors={tags.map((t) => t.color)}
      />
      {viewingRecord && (
        <RecordEventEditModal
          record={viewingRecord}
          tags={tags}
          onClose={() => setViewingRecord(null)}
          onSave={async (updated) => {
            try {
              await updateCustomerEvent(updated.customerId, updated.id, {
                customerId: updated.customerId,
                type: updated.type,
                title: updated.title,
                description: updated.description,
                date: updated.date,
              })
              setRecordEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)))
              setViewingRecord(null)
            } catch (err) {
              showError(err)
            }
          }}
          onDelete={async (id) => {
            try {
              await deleteCustomerEvent(viewingRecord.customerId, id)
              setRecordEvents((prev) => prev.filter((e) => e.id !== id))
              setViewingRecord(null)
            } catch (err) {
              showError(err)
            }
          }}
          onViewProfile={() => { routerNavigate(`/customers/${viewingRecord.customerId}`); setViewingRecord(null) }}
        />
      )}
    </DotPattern>
  )
}

// ========== Record Event Edit Modal ==========

interface RecordEventEditModalProps {
  record: CustomerCalendarEvent
  tags: EventTag[]
  onClose: () => void
  onSave: (updated: CustomerCalendarEvent) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onViewProfile: () => void
}

function RecordEventEditModal({ record, tags, onClose, onSave, onDelete, onViewProfile }: RecordEventEditModalProps) {
  const [type, setType] = useState(record.type)
  const [title, setTitle] = useState(record.title)
  const [description, setDescription] = useState(record.description ?? '')
  const [date, setDate] = useState(() => {
    const dt = new Date(record.date)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState(() => {
    const dt = new Date(record.date)
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...record,
        type,
        title: title.trim(),
        description: description.trim(),
        date: `${date}T${time}:00`,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(record.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar Registro"
      size="md"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onViewProfile}>
              Ver perfil
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do registro"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Hora"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <TagPicker
          tags={tags}
          selectedId={tags.find((t) => t.name.toLowerCase() === type)?.id}
          onChange={(id) => {
            const tag = tags.find((t) => t.id === id)
            setType(tag ? tag.name.toLowerCase() : '')
          }}
        />

        {record.customerName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{record.customerName}</span>
          </div>
        )}

        <TextArea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes do registro..."
        />
      </div>
    </Modal>
  )
}

// ========== Month View ==========

interface MonthViewProps {
  days: CalendarDay[]
  expandedDay: string | null
  setExpandedDay: (key: string | null) => void
  onDayClick: (date: Date) => void
  onEventClick: (event: UnifiedEvent) => void
}

function MonthView({ days, expandedDay, setExpandedDay, onDayClick, onEventClick }: MonthViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="grid grid-cols-7">
        {WEEKDAYS_SHORT.map((day, i) => (
          <div key={i} className="py-2 text-center text-[11px] font-semibold text-gray-400 tracking-wide">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-gray-100">
        {days.map((day, i) => {
          const key = toDateKey(day.date)
          const isExpanded = expandedDay === key
          const hiddenCount = day.events.length - MAX_VISIBLE_EVENTS
          const visibleEvents = isExpanded ? day.events : day.events.slice(0, MAX_VISIBLE_EVENTS)
          const isFirstRow = i < 7

          return (
            <div
              key={i}
              onClick={() => onDayClick(day.date)}
              className={`
                min-h-[100px] px-1 pt-1 pb-1.5 cursor-pointer transition-colors group/cell
                ${!isFirstRow ? 'border-t border-gray-100' : ''}
                ${i % 7 !== 6 ? 'border-r border-gray-100' : ''}
                ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50/60' : 'bg-gray-50/30'}
                ${day.isToday ? 'bg-brand-50/20' : ''}
              `}
            >
              <div className="flex items-center justify-center mb-0.5">
                <span
                  className={`
                    text-[13px] w-7 h-7 flex items-center justify-center rounded-full font-medium transition-colors
                    ${day.isToday
                      ? 'bg-brand-600 text-white font-semibold'
                      : day.isCurrentMonth
                        ? 'text-gray-900 group-hover/cell:bg-gray-100'
                        : 'text-gray-300'
                    }
                  `}
                >
                  {day.date.getDate()}
                </span>
              </div>

              <div className="space-y-px" onClick={(e) => e.stopPropagation()}>
                {visibleEvents.map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    variant="compact"
                    onClick={() => onEventClick(event)}
                  />
                ))}
                {!isExpanded && hiddenCount > 0 && (
                  <button
                    onClick={() => setExpandedDay(key)}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-brand-600 font-medium py-0.5 rounded transition-colors"
                  >
                    +{hiddenCount} mais
                  </button>
                )}
                {isExpanded && day.events.length > MAX_VISIBLE_EVENTS && (
                  <button
                    onClick={() => setExpandedDay(null)}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-brand-600 font-medium py-0.5 rounded transition-colors"
                  >
                    Menos
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== Week View ==========

interface WeekViewProps {
  days: CalendarDay[]
  onDayClick: (date: Date) => void
  onEventClick: (event: UnifiedEvent) => void
}

function WeekView({ days, onDayClick, onEventClick }: WeekViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {days.map((day, i) => (
          <div
            key={i}
            className={`py-3 text-center ${i < 6 ? 'border-r border-gray-100' : ''} ${day.isToday ? 'bg-brand-50/30' : ''}`}
          >
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{WEEKDAYS[i]}</p>
            <p className={`text-xl font-semibold mt-0.5 ${day.isToday ? 'text-brand-600' : 'text-gray-900'}`}>
              {day.date.getDate()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-h-[420px]">
        {days.map((day, i) => (
          <div
            key={i}
            onClick={() => onDayClick(day.date)}
            className={`
              p-1.5 space-y-1 cursor-pointer transition-colors
              ${i < 6 ? 'border-r border-gray-100' : ''}
              ${day.isToday ? 'bg-brand-50/15' : 'hover:bg-gray-50/40'}
            `}
          >
            <div onClick={(e) => e.stopPropagation()}>
              {day.events.map((event) => (
                <div key={event.id} className="mb-1">
                  <EventPill
                    event={event}
                    variant="normal"
                    onClick={() => onEventClick(event)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== Day View ==========

interface DayViewProps {
  events: UnifiedEvent[]
  onEventClick: (event: UnifiedEvent) => void
}

function DayView({ events, onEventClick }: DayViewProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="py-20 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Nenhum evento</p>
          <p className="text-xs text-gray-400 mt-1">Clique em "Agendar" para criar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-gray-100">
      {events.map((event) => {
        const time = formatTime(event.dateTime)
        const isCalendarEvent = event.source === 'calendar'
        const description = isCalendarEvent ? event.calendarEvent?.description : event.recordEvent?.description

        return (
          <div
            key={event.id}
            onClick={() => onEventClick(event)}
            className="flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer hover:bg-gray-50/60"
          >
            <div className="shrink-0 w-14 pt-0.5">
              <p className="text-[13px] font-medium text-gray-500 tabular-nums">{time}</p>
            </div>

            <div
              className="shrink-0 w-[3px] self-stretch rounded-full mt-0.5 mb-0.5"
              style={{ backgroundColor: event.color }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-semibold text-gray-900 truncate">{event.title}</h4>
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-px rounded-full text-white" style={{ backgroundColor: event.color }}>
                  {event.tagName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {event.customerName && <span className="text-[12px] text-gray-400">{event.customerName}</span>}
              </div>
              {description && (
                <p className="text-[12px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========== Event Pill ==========

interface EventPillProps {
  event: UnifiedEvent
  variant: 'compact' | 'normal'
  onClick?: () => void
}

function EventPill({ event, variant, onClick }: EventPillProps) {
  const time = formatTime(event.dateTime)

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-1 px-1 py-px rounded text-[10px] font-medium truncate cursor-pointer transition-colors"
        style={{ backgroundColor: event.color + '12', color: event.color }}
        title={`${time} · ${event.tagName ?? ''} · ${event.title} · ${event.customerName ?? ''}`}
      >
        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: event.color }} />
        <span className="truncate" style={{ color: '#333' }}>{event.title || event.tagName}</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:shadow-sm transition-all"
      style={{ backgroundColor: event.color + '12' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: event.color }} />
        <span className="truncate font-semibold text-[11px] text-gray-800">{event.title || event.tagName}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5 pl-3">
        {time}{event.customerName ? ` · ${event.customerName}` : ''}
      </p>
    </div>
  )
}
