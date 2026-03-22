import { useState, useEffect } from 'react'
import type { EventTag, CalendarEvent, Customer, Page } from '@/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import TextArea from '@/components/ui/TextArea'
import Toggle from '@/components/ui/Toggle'
import { getCustomers } from '@/lib/api/customer-api'
import TagPicker from '@/components/calendar/TagPicker'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: CreateEventPayload) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  tags: EventTag[]
  onNewTag: () => void
  event?: CalendarEvent | null
  initialDate?: Date | null
}

export interface CreateEventPayload {
  summary: string
  description?: string
  location?: string
  allDay: boolean
  startDate?: string
  startDateTime?: string
  startTimeZone?: string
  endDate?: string
  endDateTime?: string
  endTimeZone?: string
  tagId?: string
  customerId?: string
  status: string
}

function formatDateForInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTimeForInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export default function CreateEventModal({ isOpen, onClose, onSave, onDelete, tags, onNewTag, event, initialDate }: CreateEventModalProps) {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [tagId, setTagId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => {
    if (!isOpen) return

    if (event) {
      setSummary(event.summary)
      setDescription(event.description ?? '')
      setLocation(event.location ?? '')
      setAllDay(event.allDay)
      setTagId(event.tagId ?? '')
      setCustomerId(event.customerId ?? '')
      setCustomerSearch(event.customerName ?? '')

      if (event.allDay) {
        setStartDate(event.start.date ?? '')
        setEndDate(event.end.date ?? '')
        setStartTime('')
        setEndTime('')
      } else {
        const startDt = event.start.dateTime ? new Date(event.start.dateTime) : new Date()
        const endDt = event.end.dateTime ? new Date(event.end.dateTime) : addHours(startDt, 1)
        setStartDate(formatDateForInput(startDt))
        setStartTime(formatTimeForInput(startDt))
        setEndDate(formatDateForInput(endDt))
        setEndTime(formatTimeForInput(endDt))
      }
    } else {
      const base = initialDate ?? new Date()
      const now = new Date()
      const roundedHour = new Date(now)
      roundedHour.setMinutes(0, 0, 0)
      roundedHour.setHours(roundedHour.getHours() + 1)

      setSummary('')
      setDescription('')
      setLocation('')
      setAllDay(false)
      setStartDate(formatDateForInput(base))
      setStartTime(formatTimeForInput(roundedHour))
      setEndDate(formatDateForInput(base))
      setEndTime(formatTimeForInput(addHours(roundedHour, 1)))
      setTagId(tags.length > 0 ? tags[0].id : '')
      setCustomerId('')
      setCustomerSearch('')
    }
  }, [isOpen, event, initialDate, tags])

  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomers([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const page: Page<Customer> = await getCustomers(0, 10, customerSearch)
        setCustomers(page.content)
        setShowCustomerDropdown(true)
      } catch {
        setCustomers([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerSearch])

  const handleSave = async () => {
    if (!summary.trim()) return
    setSaving(true)
    try {
      const payload: CreateEventPayload = {
        summary: summary.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        allDay,
        tagId: tagId || undefined,
        customerId: customerId || undefined,
        status: 'confirmed',
      }

      if (allDay) {
        payload.startDate = startDate
        payload.endDate = endDate || startDate
      } else {
        payload.startDateTime = `${startDate}T${startTime}:00`
        payload.startTimeZone = timeZone
        payload.endDateTime = `${endDate}T${endTime}:00`
        payload.endTimeZone = timeZone
      }

      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(event.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id)
    setCustomerSearch(customer.data.name)
    setShowCustomerDropdown(false)
  }

  const clearCustomer = () => {
    setCustomerId('')
    setCustomerSearch('')
    setCustomers([])
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Editar Agendamento' : 'Novo Agendamento'}
      size="md"
      footer={
        <div className="flex items-center justify-between">
          <div>
            {event && onDelete && (
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !summary.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Título"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Ex: Consulta com Maria"
          autoFocus
        />

        <Toggle label="Dia inteiro" checked={allDay} onChange={setAllDay} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data início"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (!endDate || e.target.value > endDate) setEndDate(e.target.value)
            }}
          />
          {!allDay && (
            <Input
              label="Hora início"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {!allDay && (
            <Input
              label="Hora fim"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          )}
        </div>

        <TagPicker tags={tags} selectedId={tagId} onChange={setTagId} onNewTag={onNewTag} />

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                if (!e.target.value.trim()) clearCustomer()
              }}
              onFocus={() => {
                if (customers.length > 0) setShowCustomerDropdown(true)
              }}
              placeholder="Buscar cliente..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors placeholder:text-gray-400"
            />
            {customerId && (
              <button
                type="button"
                onClick={clearCustomer}
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {showCustomerDropdown && customers.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {c.data.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Localização (opcional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Consultório, Sala 3"
        />

        <TextArea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes do agendamento..."
        />
      </div>
    </Modal>
  )
}
