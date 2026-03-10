import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type {
  Patient,
  PatientData,
  PatientNote,
  PatientEvent,
  PatientEventType,
  Laudo,
} from '@/types'
import {
  createEmptyPatientEvent,
  PATIENT_EVENT_TYPE_LABELS,
  PATIENT_EVENT_TYPE_COLORS,
} from '@/types'
import {
  getCustomer,
  updateCustomer,
  getCustomerNotes,
  createCustomerNote,
  deleteCustomerNote as apiDeleteCustomerNote,
  getCustomerEvents,
  createCustomerEvent,
  deleteCustomerEvent as apiDeleteCustomerEvent,
} from '@/lib/api/customer-api'
import { getReportsByCustomer } from '@/lib/api/report-api'
import { formatDateTime, formatDate } from '@/lib/utils'
import { createLaudoFromPatient } from '@/lib/laudo-utils'
import { useError } from '@/contexts/ErrorContext'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'

// ========== Types ==========

type ProfileSection = 'personal' | 'contact' | 'clinical' | 'laudos' | 'notes' | 'timeline'

interface TabItem {
  key: ProfileSection
  label: string
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

function FileTextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

// ========== Tabs config ==========

const TABS: TabItem[] = [
  { key: 'personal', label: 'Dados Pessoais' },
  { key: 'contact', label: 'Contato' },
  { key: 'clinical', label: 'Dados Clínicos' },
  { key: 'laudos', label: 'Laudos' },
  { key: 'notes', label: 'Notas' },
  { key: 'timeline', label: 'Histórico' },
]

const EVENT_TYPE_OPTIONS: { value: PatientEventType; label: string }[] = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'laudo', label: 'Laudo' },
  { value: 'observacao', label: 'Observação' },
]

// ========== InfoField helper ==========

function InfoField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || '\u2014'}</dd>
    </div>
  )
}

// ========== Timeline helpers ==========

/** Group events by month/year for visual separation */
function groupEventsByMonth(events: PatientEvent[]): { label: string; events: PatientEvent[] }[] {
  const groups: Map<string, PatientEvent[]> = new Map()

  for (const event of events) {
    const d = new Date(event.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, evts]) => ({
      label: new Date(evts[0].date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      events: evts,
    }))
}

// ========== Component ==========

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useError()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [editData, setEditData] = useState<PatientData | null>(null)
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal')
  const [saving, setSaving] = useState(false)

  // Laudos
  const [laudos, setLaudos] = useState<Laudo[]>([])

  // Notes
  const [notes, setNotes] = useState<PatientNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState('')

  // Timeline
  const [events, setEvents] = useState<PatientEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState<PatientEvent | null>(null)

  // Load patient
  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const [p, patientLaudos, patientNotes, patientEvents] = await Promise.all([
          getCustomer(id!),
          getReportsByCustomer(id!),
          getCustomerNotes(id!),
          getCustomerEvents(id!),
        ])
        setPatient(p)
        setEditData({ ...p.data })
        setLaudos(patientLaudos)
        setNotes(patientNotes)
        setEvents(patientEvents)
      } catch (err) {
        showError(err)
      }
    }
    load()
  }, [id, showError])

  // ========== Handlers ==========

  const updateField = useCallback(
    (field: keyof PatientData, value: string) => {
      setEditData((prev) => (prev ? { ...prev, [field]: value } : prev))
    },
    []
  )

  const handleSaveSection = useCallback(async () => {
    if (!patient || !editData) return
    setSaving(true)
    try {
      const updated: Patient = {
        ...patient,
        data: { ...editData },
        updatedAt: new Date().toISOString(),
      }
      await updateCustomer(updated)
      setPatient(updated)
    } catch (err) {
      showError(err)
    } finally {
      setSaving(false)
    }
  }, [patient, editData, showError])

  const handleCreateLaudo = useCallback(async () => {
    if (!patient) return
    try {
      const laudo = await createLaudoFromPatient(patient)
      navigate(`/laudo/${laudo.id}`)
    } catch (err) {
      showError(err)
    }
  }, [patient, navigate, showError])

  const handleAddNote = useCallback(async () => {
    if (!patient || !newNoteContent.trim()) return
    try {
      await createCustomerNote(patient.id, { content: newNoteContent.trim() })
      const updatedNotes = await getCustomerNotes(patient.id)
      setNotes(updatedNotes)
      setNewNoteContent('')
    } catch (err) {
      showError(err)
    }
  }, [patient, newNoteContent, showError])

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!patient) return
      try {
        await apiDeleteCustomerNote(patient.id, noteId)
        const updatedNotes = await getCustomerNotes(patient.id)
        setNotes(updatedNotes)
      } catch (err) {
        showError(err)
      }
    },
    [patient, showError]
  )

  // Timeline handlers
  const handleOpenEventForm = useCallback(() => {
    if (!patient) return
    setNewEvent(createEmptyPatientEvent(patient.id))
    setShowEventForm(true)
  }, [patient])

  const handleSaveEvent = useCallback(async () => {
    if (!patient || !newEvent || !newEvent.title.trim()) return
    try {
      await createCustomerEvent(patient.id, newEvent)
      const updatedEvents = await getCustomerEvents(patient.id)
      setEvents(updatedEvents)
      setShowEventForm(false)
      setNewEvent(null)
    } catch (err) {
      showError(err)
    }
  }, [patient, newEvent, showError])

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!patient) return
      try {
        await apiDeleteCustomerEvent(patient.id, eventId)
        const updatedEvents = await getCustomerEvents(patient.id)
        setEvents(updatedEvents)
      } catch (err) {
        showError(err)
      }
    },
    [patient, showError]
  )

  // ========== Not found ==========

  if (!patient || !editData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Paciente não encontrado</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/pacientes')}
          >
            Voltar para Pacientes
          </Button>
        </div>
      </div>
    )
  }

  // ========== Avatar initial ==========

  const initial = patient.data.name
    ? patient.data.name.charAt(0).toUpperCase()
    : '?'

  // ========== Render sections ==========

  function renderPersonalSection() {
    return (
      <SectionCard title="Dados Pessoais" onSave={handleSaveSection} saving={saving}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome completo" value={editData!.name} onChange={(e) => updateField('name', e.target.value)} />
          <Input label="CPF" value={editData!.cpf} onChange={(e) => updateField('cpf', e.target.value)} />
          <Input label="Data de Nascimento" type="date" value={editData!.birthDate} onChange={(e) => updateField('birthDate', e.target.value)} />
          <Input label="Idade" value={editData!.age} onChange={(e) => updateField('age', e.target.value)} placeholder="Ex: 32 anos e 4 meses" />
          <Input label="Escolaridade" value={editData!.education} onChange={(e) => updateField('education', e.target.value)} />
          <Input label="Profissão" value={editData!.profession} onChange={(e) => updateField('profession', e.target.value)} />
          <Input label="Nome da Mãe" value={editData!.motherName} onChange={(e) => updateField('motherName', e.target.value)} />
          <Input label="Nome do Pai" value={editData!.fatherName} onChange={(e) => updateField('fatherName', e.target.value)} />
          <Input label="Responsável Legal" value={editData!.guardianName ?? ''} onChange={(e) => updateField('guardianName', e.target.value)} />
          <Input label="Parentesco" value={editData!.guardianRelationship ?? ''} onChange={(e) => updateField('guardianRelationship', e.target.value)} />
        </div>
      </SectionCard>
    )
  }

  function renderContactSection() {
    return (
      <SectionCard title="Contato" onSave={handleSaveSection} saving={saving}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Telefone" value={editData!.phone ?? ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="(31) 99999-0000" />
          <Input label="E-mail" type="email" value={editData!.email ?? ''} onChange={(e) => updateField('email', e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Rua / Endereço" value={editData!.addressStreet ?? ''} onChange={(e) => updateField('addressStreet', e.target.value)} />
          </div>
          <Input label="Cidade" value={editData!.addressCity ?? ''} onChange={(e) => updateField('addressCity', e.target.value)} />
          <Input label="Estado" value={editData!.addressState ?? ''} onChange={(e) => updateField('addressState', e.target.value)} />
          <Input label="CEP" value={editData!.addressZipCode ?? ''} onChange={(e) => updateField('addressZipCode', e.target.value)} placeholder="00000-000" />
        </div>
      </SectionCard>
    )
  }

  function renderClinicalSection() {
    return (
      <SectionCard title="Dados Clínicos" onSave={handleSaveSection} saving={saving}>
        <div className="space-y-4">
          <TextArea label="Queixa Principal" value={editData!.chiefComplaint ?? ''} onChange={(e) => updateField('chiefComplaint', e.target.value)} placeholder="Descreva a queixa principal do paciente..." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Diagnóstico" value={editData!.diagnosis ?? ''} onChange={(e) => updateField('diagnosis', e.target.value)} />
            <Input label="Médico Solicitante" value={editData!.referralDoctor ?? ''} onChange={(e) => updateField('referralDoctor', e.target.value)} />
          </div>
          <TextArea label="Medicações" value={editData!.medications ?? ''} onChange={(e) => updateField('medications', e.target.value)} placeholder="Liste as medicações em uso..." />
        </div>
      </SectionCard>
    )
  }

  function renderLaudosSection() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Laudos</h2>
          <Button size="sm" onClick={handleCreateLaudo}>+ Novo Laudo</Button>
        </div>
        {laudos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <div className="flex justify-center text-gray-400 mb-2"><FileTextIcon /></div>
            <p className="text-sm text-gray-500">Nenhum laudo criado para este paciente</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={handleCreateLaudo}>Criar primeiro laudo</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {laudos.map((laudo) => (
              <button key={laudo.id} onClick={() => navigate(`/laudo/${laudo.id}`)} className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{laudo.patientName || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Criado em {formatDateTime(laudo.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-gray-400">{laudo.blocks.length} {laudo.blocks.length === 1 ? 'bloco' : 'blocos'}</span>
                    <StatusBadge status={laudo.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderNotesSection() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Notas de Acompanhamento</h2>
        <div className="rounded-lg border border-gray-200 p-3 space-y-2">
          <TextArea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Escreva uma nota de acompanhamento..." className="min-h-[60px]" />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddNote} disabled={!newNoteContent.trim()}>Adicionar Nota</Button>
          </div>
        </div>
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm text-gray-500">Nenhuma nota ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-gray-200 p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      {formatDateTime(note.createdAt)}
                      {note.updatedAt !== note.createdAt && <span className="ml-1">(editado)</span>}
                    </p>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" title="Excluir nota">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderTimelineSection() {
    const grouped = groupEventsByMonth(events)

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Histórico</h2>
          <Button size="sm" onClick={handleOpenEventForm}>+ Novo Evento</Button>
        </div>

        {/* New event form */}
        {showEventForm && newEvent && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Novo evento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as PatientEventType })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
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
              <Button variant="ghost" size="sm" onClick={() => { setShowEventForm(false); setNewEvent(null) }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEvent} disabled={!newEvent.title.trim()}>
                Salvar Evento
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {events.length === 0 && !showEventForm ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Nenhum evento registrado</p>
            <p className="text-xs text-gray-400 mt-1">Registre consultas, retornos e avaliações</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={handleOpenEventForm}>
              Registrar primeiro evento
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Vertical timeline */}
                <ol className="relative border-l-2 border-gray-200 ml-3">
                  {group.events.map((event) => {
                    const dotColor = PATIENT_EVENT_TYPE_COLORS[event.type]
                    const typeLabel = PATIENT_EVENT_TYPE_LABELS[event.type]
                    const eventDate = new Date(event.date)
                    const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    const dateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

                    return (
                      <li key={event.id} className="mb-6 ml-6 group">
                        {/* Dot */}
                        <span className={`absolute -left-[9px] w-4 h-4 rounded-full ${dotColor} ring-4 ring-white`} />

                        {/* Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Type badge + time */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${dotColor}`}>
                                  {typeLabel}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {dateStr} às {timeStr}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-sm font-medium text-gray-900">
                                {event.title}
                              </h4>

                              {/* Description */}
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                                  {event.description}
                                </p>
                              )}
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              title="Excluir evento"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const sectionRenderers: Record<ProfileSection, () => React.ReactNode> = {
    personal: renderPersonalSection,
    contact: renderContactSection,
    clinical: renderClinicalSection,
    laudos: renderLaudosSection,
    notes: renderNotesSection,
    timeline: renderTimelineSection,
  }

  // ========== Main Render ==========

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Breadcrumb header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/pacientes')}
              className="text-gray-500 hover:text-brand-700 transition-colors"
            >
              Pacientes
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">
              {patient.data.name || 'Sem nome'}
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setActiveSection('personal')}>
            Editar Perfil
          </Button>
        </div>
      </header>

      {/* Profile card */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-3xl font-semibold ring-4 ring-white shadow-sm">
                {initial}
              </div>
            </div>

            {/* Info grid */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                <InfoField label="Nome" value={patient.data.name} />
                <InfoField label="CPF" value={patient.data.cpf} />
                <InfoField label="Idade" value={patient.data.age} />

                <InfoField label="Telefone" value={patient.data.phone} />
                <InfoField
                  label="Data de Nascimento"
                  value={patient.data.birthDate ? formatDate(patient.data.birthDate) : undefined}
                />
                <InfoField label="Escolaridade" value={patient.data.education} />

                <InfoField label="Profissão" value={patient.data.profession} />
                <InfoField label="Cadastrado" value={formatDateTime(patient.createdAt)} />
                <InfoField label="Atualizado" value={formatDateTime(patient.updatedAt)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-0 -mb-px">
            {TABS.map((tab) => {
              const isActive = activeSection === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`
                    px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `.trim()}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {sectionRenderers[activeSection]()}
        </div>
      </div>
    </div>
  )
}

// ========== SectionCard helper ==========

function SectionCard({
  title,
  onSave,
  saving,
  children,
}: {
  title: string
  onSave: () => void
  saving: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
      {children}
    </div>
  )
}
