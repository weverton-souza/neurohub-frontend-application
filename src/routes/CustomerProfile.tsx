import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type {
  Customer,
  CustomerData,
  CustomerNote,
  CustomerEvent,
  Report,
  ReportTemplate,
  Block,
  FormResponse,
  FormLink,
  Form,
} from '@/types'
import { getVerticalRecordConfig } from '@/types'
import {
  getCustomer,
  updateCustomer,
  getCustomerNotes,
  getCustomerEvents,
} from '@/lib/api/customer-api'
import { getReportsByCustomer, createReport } from '@/lib/api/report-api'
import { getReportTemplates } from '@/lib/api/template-api'
import { getAllTemplates } from '@/lib/default-templates'
import { getFormResponsesByCustomer, listForms, listFormResponses } from '@/lib/api/form-api'
import { getFormLinksByCustomer, createFormLink, revokeFormLink } from '@/lib/api/form-link-api'
import { formatDateTime, calculateAge } from '@/lib/utils'
import { createReportFromCustomer } from '@/lib/report-utils'
import { useError } from '@/contexts/ErrorContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  FORM_RESPONSE_STATUS_LABELS,
  FORM_RESPONSE_STATUS_COLORS,
} from '@/types'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import TextArea from '@/components/ui/TextArea'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CustomerRecordTab from '@/components/customer/CustomerRecordTab'
import StatusBadge from '@/components/ui/StatusBadge'
import ListCard, { ListCardPill } from '@/components/ui/ListCard'

// ========== Types ==========

type ProfileSection = 'personal' | 'contact' | 'clinical' | 'reports' | 'forms' | 'links' | 'record'

interface TabItem {
  key: ProfileSection
  label: string
  icon: React.ReactNode
}

// ========== Avatar ==========

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-teal-400 to-teal-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-indigo-400 to-indigo-600',
  'from-emerald-400 to-emerald-600',
  'from-cyan-400 to-cyan-600',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

// ========== Icons ==========

// TABS is built dynamically in the component to use the vertical-specific tab name

// ========== Component ==========

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useError()
  const { user } = useAuth()
  const vertical = user?.vertical ?? 'GENERAL'
  const verticalConfig = getVerticalRecordConfig(vertical)

  const TABS: TabItem[] = [
    { key: 'personal', label: 'Dados Pessoais', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: 'contact', label: 'Contato', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
    ...(vertical === 'HEALTH' ? [{ key: 'clinical' as ProfileSection, label: 'Dados Clínicos', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> }] : []),
    { key: 'reports', label: 'Relatórios', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { key: 'forms', label: 'Questionários', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
    { key: 'links', label: 'Links', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
    { key: 'record', label: verticalConfig.tabName, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  ]

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [editData, setEditData] = useState<CustomerData | null>(null)
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal')
  const [saving, setSaving] = useState(false)

  const [reports, setReports] = useState<Report[]>([])
  const [formResponses, setFormResponses] = useState<FormResponse[]>([])
  const [formLinks, setFormLinks] = useState<FormLink[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [allTemplates, setAllTemplates] = useState<ReportTemplate[]>([])
  const [creatingReport, setCreatingReport] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const [p, customerReports, customerNotes, customerEvents, customerFormResponses, customerFormLinks, allForms] = await Promise.all([
          getCustomer(id!),
          getReportsByCustomer(id!),
          getCustomerNotes(id!),
          getCustomerEvents(id!),
          getFormResponsesByCustomer(id!),
          getFormLinksByCustomer(id!),
          listForms(),
        ])
        setCustomer(p)
        setEditData({ ...p.data })
        setReports(customerReports)
        setNotes(customerNotes)
        setEvents(customerEvents)
        setFormResponses(customerFormResponses)
        setFormLinks(customerFormLinks)
        setForms(allForms)
      } catch (err) {
        showError(err)
      }
    }
    load()
  }, [id, showError])

  // ========== Handlers ==========

  const updateField = useCallback(
    (field: keyof CustomerData, value: string) => {
      setEditData((prev) => (prev ? { ...prev, [field]: value } : prev))
    },
    []
  )

  const handleSaveSection = useCallback(async () => {
    if (!customer || !editData) return
    setSaving(true)
    try {
      const updated: Customer = {
        ...customer,
        data: { ...editData },
        updatedAt: new Date().toISOString(),
      }
      await updateCustomer(updated)
      setCustomer(updated)
    } catch (err) {
      showError(err)
    } finally {
      setSaving(false)
    }
  }, [customer, editData, showError])

  const handleCreateReport = useCallback(async () => {
    if (!customer) return
    try {
      const customTemplates = await getReportTemplates()
      setAllTemplates(getAllTemplates(customTemplates))
      setShowTemplateModal(true)
    } catch (err) {
      showError(err)
    }
  }, [customer, showError])

  const handleCreateFromScratch = useCallback(async () => {
    if (!customer) return
    try {
      const report = await createReportFromCustomer(customer)
      setShowTemplateModal(false)
      navigate(`/reports/${report.id}`)
    } catch (err) {
      showError(err)
    }
  }, [customer, navigate, showError])

  const handleCreateFromTemplate = useCallback(async (template: ReportTemplate) => {
    if (!customer || creatingReport) return
    setCreatingReport(true)
    try {
      const blocks: Block[] = template.blocks.map((tb) => ({
        id: crypto.randomUUID(),
        type: tb.type,
        order: tb.order,
        data: JSON.parse(JSON.stringify(tb.data)),
        collapsed: false,
      }))

      let formResponseId: string | undefined
      const linkedForm = forms.find((f) => f.linkedTemplateId === template.id)
      if (linkedForm) {
        const responses = await listFormResponses(linkedForm.id)
        const customerResponse = responses.find(
          (r) => r.customerId === customer.id && !r.generatedReportId
        )
        if (customerResponse) {
          formResponseId = customerResponse.id
        }
      }

      const report = await createReport({
        status: 'rascunho',
        customerName: customer.data.name,
        customerId: customer.id,
        formResponseId,
        blocks,
      })

      setShowTemplateModal(false)
      navigate(`/reports/${report.id}`)
    } catch (err) {
      showError(err)
    } finally {
      setCreatingReport(false)
    }
  }, [customer, forms, creatingReport, navigate, showError])

  const handleGenerateLink = useCallback(async () => {
    if (!customer || !selectedFormId) return
    setGeneratingLink(true)
    try {
      await createFormLink(selectedFormId, customer.id)
      const updatedLinks = await getFormLinksByCustomer(customer.id)
      setFormLinks(updatedLinks)
      setShowLinkForm(false)
      setSelectedFormId('')
    } catch (err) {
      showError(err)
    } finally {
      setGeneratingLink(false)
    }
  }, [customer, selectedFormId, showError])

  const handleRevokeLink = useCallback(async (linkId: string) => {
    if (!customer) return
    try {
      await revokeFormLink(linkId)
      const updatedLinks = await getFormLinksByCustomer(customer.id)
      setFormLinks(updatedLinks)
    } catch (err) {
      showError(err)
    }
  }, [customer, showError])

  const handleCopyLink = useCallback((link: FormLink) => {
    const url = `${window.location.origin}/public/forms/${link.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLinkId(link.id)
      setTimeout(() => setCopiedLinkId(null), 2000)
    })
  }, [])

  const formsMap = new Map(forms.map((f) => [f.id, f]))

  // ========== Not found ==========

  if (!customer || !editData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  const initials = getInitials(customer.data.name)
  const avatarColor = getAvatarColor(customer.data.name || customer.id)

  // ========== Render sections ==========

  function renderPersonalSection() {
    return (
      <SectionCard title="Dados Pessoais" onSave={handleSaveSection} saving={saving}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome completo" value={editData!.name} onChange={(e) => updateField('name', e.target.value)} />
          <Select label="Sexo" value={editData!.sex || ''} onChange={(value) => updateField('sex', value)} options={[{ value: '', label: 'Selecione...' }, { value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }, { value: 'Outro', label: 'Outro' }]} />
          <Input label="CPF" value={editData!.cpf} onChange={(e) => updateField('cpf', e.target.value)} />
          <Input label="Data de Nascimento" type="date" value={editData!.birthDate} onChange={(e) => updateField('birthDate', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {calculateAge(editData!.birthDate) || '\u2014'}
            </div>
          </div>
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
          <TextArea label="Queixa Principal" value={editData!.chiefComplaint ?? ''} onChange={(e) => updateField('chiefComplaint', e.target.value)} placeholder="Descreva a queixa principal do cliente..." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Diagnóstico" value={editData!.diagnosis ?? ''} onChange={(e) => updateField('diagnosis', e.target.value)} />
            <Input label="Médico Solicitante" value={editData!.referralDoctor ?? ''} onChange={(e) => updateField('referralDoctor', e.target.value)} />
          </div>
          <TextArea label="Medicações" value={editData!.medications ?? ''} onChange={(e) => updateField('medications', e.target.value)} placeholder="Liste as medicações em uso..." />
        </div>
      </SectionCard>
    )
  }

  function renderReportsSection() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Relatórios</h2>
          <Button size="sm" onClick={handleCreateReport}>+ Novo Relatório</Button>
        </div>
        {reports.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum relatório</p>
            <p className="text-xs text-gray-500 mt-1">Crie o primeiro relatório para este cliente</p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={handleCreateReport}>Criar relatório</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ListCard
                key={report.id}
                onClick={() => navigate(`/reports/${report.id}`)}
                title={report.formId ? (formsMap.get(report.formId)?.title || report.customerName || 'Relatório') : (report.customerName || 'Relatório')}
                pills={
                  <>
                    <ListCardPill>{formatDateTime(report.createdAt)}</ListCardPill>
                    <ListCardPill>{report.blocks.length} {report.blocks.length === 1 ? 'bloco' : 'blocos'}</ListCardPill>
                  </>
                }
                badges={<StatusBadge status={report.status} />}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderFormsSection() {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Questionários Respondidos</h2>
        {formResponses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhuma resposta</p>
            <p className="text-xs text-gray-500 mt-1">As respostas de questionários aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formResponses.map((resp) => {
              const form = formsMap.get(resp.formId)
              const answeredCount = resp.answers.filter((a) =>
                a.value || (a.selectedOptionIds && a.selectedOptionIds.length > 0) || a.scaleValue != null
              ).length
              return (
                <ListCard
                  key={resp.id}
                  onClick={() => navigate(`/forms/${resp.formId}/fill?response=${resp.id}`)}
                  title={form?.title || 'Formulário'}
                  pills={
                    <>
                      <ListCardPill>{formatDateTime(resp.updatedAt)}</ListCardPill>
                      <ListCardPill>{answeredCount} {answeredCount === 1 ? 'resposta' : 'respostas'}</ListCardPill>
                    </>
                  }
                  badges={
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                      FORM_RESPONSE_STATUS_COLORS[resp.status].bg
                    } ${FORM_RESPONSE_STATUS_COLORS[resp.status].text}`}>
                      {FORM_RESPONSE_STATUS_LABELS[resp.status]}
                    </span>
                  }
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderLinksSection() {
    const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
      PENDING: { label: 'Pendente', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
      ANSWERED: { label: 'Respondido', color: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
      EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Links de Formulário</h2>
          <Button size="sm" onClick={() => setShowLinkForm(true)}>+ Gerar Link</Button>
        </div>

        {showLinkForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Gerar novo link</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formulário</label>
              <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              >
                <option value="">Selecione um formulário</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>{f.title || 'Sem título'}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowLinkForm(false); setSelectedFormId('') }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleGenerateLink} disabled={!selectedFormId || generatingLink}>
                {generatingLink ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </div>
          </div>
        )}

        {formLinks.length === 0 && !showLinkForm ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum link gerado</p>
            <p className="text-xs text-gray-500 mt-1">Gere links para o cliente responder formulários</p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setShowLinkForm(true)}>
              Gerar link
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {formLinks.map((link) => {
              const form = formsMap.get(link.formId)
              const cfg = statusConfig[link.status] || statusConfig.PENDING
              const isCopied = copiedLinkId === link.id
              return (
                <div key={link.id} className="bg-white rounded-xl border border-gray-200 p-4 group hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{form?.title || 'Formulário'}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Criado em {formatDateTime(link.createdAt)}</span>
                        <span className="text-gray-300">&middot;</span>
                        <span>Expira em {formatDateTime(link.expiresAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {link.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                            title="Copiar link"
                          >
                            {isCopied ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleRevokeLink(link.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Revogar link"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderRecordSection() {
    return (
      <CustomerRecordTab
        customerId={customer!.id}
        notes={notes}
        events={events}
        onNotesChange={setNotes}
        onEventsChange={setEvents}
      />
    )
  }

  const sectionRenderers: Record<ProfileSection, () => React.ReactNode> = {
    personal: renderPersonalSection,
    contact: renderContactSection,
    clinical: renderClinicalSection,
    reports: renderReportsSection,
    forms: renderFormsSection,
    links: renderLinksSection,
    record: renderRecordSection,
  }

  // ========== Main Render ==========

  return (
    <div className="flex-1 flex flex-col">
      {/* Profile hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/customers')}
              className="text-gray-400 hover:text-brand-600 transition-colors"
            >
              Clientes
            </button>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="text-gray-300">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 font-medium truncate">
              {customer.data.name || 'Sem nome'}
            </span>
          </div>
        </div>

        {/* Profile card */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
            {/* Avatar */}
            <div className="shrink-0">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-gray-300/30`}>
                {initials}
              </div>
            </div>

            {/* Quick info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {customer.data.name || 'Cliente sem nome'}
              </h1>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {customer.data.profession && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                    {customer.data.profession}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{reports.length}</p>
                    <p className="text-xs text-gray-400 -mt-0.5">{reports.length === 1 ? 'relatório' : 'relatórios'}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{notes.length + events.length}</p>
                    <p className="text-xs text-gray-400 -mt-0.5">{notes.length + events.length === 1 ? 'registro' : 'registros'}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-xs text-gray-400">
                  Cadastrado em {formatDateTime(customer.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => {
              const isActive = activeSection === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                    ${isActive
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `.trim()}
                >
                  <span className={isActive ? 'text-brand-600' : 'text-gray-400'}>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {sectionRenderers[activeSection]()}
        </div>
      </div>

      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Novo Relatório"
        size="md"
      >
        <div className="p-4 space-y-4">
          <button
            type="button"
            onClick={handleCreateFromScratch}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 hover:bg-brand-50/50 transition-all text-left"
          >
            <div className="p-3 rounded-lg bg-gray-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Começar do zero</p>
              <p className="text-xs text-gray-500 mt-0.5">Relatório vazio com bloco de identificação</p>
            </div>
          </button>

          {allTemplates.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase font-medium">ou use um template</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-2">
                {allTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={creatingReport}
                    onClick={() => handleCreateFromTemplate(template)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left disabled:opacity-50"
                  >
                    <div className="p-3 rounded-lg bg-brand-100">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{template.blocks.length} blocos</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
      <div className="px-5 sm:px-6 py-5">
        {children}
      </div>
    </div>
  )
}
