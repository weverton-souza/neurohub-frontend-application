import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Customer, CustomerData, Report } from '@/types'
import { createEmptyCustomer } from '@/types'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/api/customer-api'
import { getReports } from '@/lib/api/report-api'
import { formatDateTime, calculateAge } from '@/lib/utils'
import { createReportFromCustomer } from '@/lib/report-utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import { useError } from '@/contexts/ErrorContext'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import ListCard, { ListCardPill, ListCardBadge, ListCardAction, TrashIcon, EditIcon, DocumentPlusIcon } from '@/components/ui/ListCard'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'

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

export default function CustomerList() {
  const navigate = useNavigate()
  const { showError } = useError()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [search, setSearch] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [customersPage, reportsPage] = await Promise.all([
        getCustomers(0, 200),
        getReports(0, 200),
      ])
      setCustomers(customersPage.content)
      setReports(reportsPage.content)
    } catch (err) {
      showError(err)
    }
  }, [showError])

  useEffect(() => { loadData() }, [loadData])

  const reportCountMap = useMemo(() => {
    const map: Record<string, Report[]> = {}
    for (const report of reports) {
      if (report.customerId) {
        if (!map[report.customerId]) map[report.customerId] = []
        map[report.customerId].push(report)
      }
    }
    return map
  }, [reports])

  const filteredCustomers = useMemo(() => {
    const sorted = [...customers].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    if (!search.trim()) return sorted
    const term = search.toLowerCase()
    return sorted.filter(
      (p) =>
        p.data.name.toLowerCase().includes(term) ||
        p.data.cpf.includes(term)
    )
  }, [customers, search])

  const { page: paginatedPage, setCurrentPage, pageSize, changePageSize, resetPage } = usePagination(filteredCustomers)

  useEffect(() => {
    resetPage()
  }, [search, resetPage])

  const handleOpenNew = useCallback(() => {
    setEditingCustomer(createEmptyCustomer())
    setShowFormModal(true)
  }, [])

  const handleOpenEdit = useCallback((customer: Customer) => {
    setEditingCustomer({ ...customer, data: { ...customer.data } })
    setShowFormModal(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingCustomer) return
    try {
      const isNew = !customers.find((p) => p.id === editingCustomer.id)
      if (isNew) {
        await createCustomer(editingCustomer)
      } else {
        await updateCustomer(editingCustomer)
      }
      await loadData()
      setShowFormModal(false)
      setEditingCustomer(null)
    } catch (err) {
      showError(err)
    }
  }, [editingCustomer, customers, loadData, showError])

  const handleDeleteCustomer = useCallback(async (id: string) => {
    try {
      await deleteCustomer(id)
      await loadData()
    } catch (err) {
      showError(err)
    }
  }, [loadData, showError])

  const { confirmId: confirmDeleteId, requestDelete: setConfirmDeleteId, confirmDelete, cancelDelete } = useConfirmDelete(handleDeleteCustomer)

  const handleCreateReport = useCallback(
    async (customer: Customer) => {
      try {
        const report = await createReportFromCustomer(customer)
        navigate(`/reports/${report.id}`)
      } catch (err) {
        showError(err)
      }
    },
    [navigate, showError]
  )

  const updateEditingField = useCallback(
    (field: keyof CustomerData, value: string) => {
      if (!editingCustomer) return
      setEditingCustomer({
        ...editingCustomer,
        data: { ...editingCustomer.data, [field]: value },
      })
    },
    [editingCustomer]
  )

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes"
        actions={
          <Button onClick={handleOpenNew}>+ Novo Cliente</Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search + filters */}
        {customers.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-1 relative">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <label htmlFor="page-size" className="text-sm text-gray-400">
                Por página:
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                {[10, 25, 50].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {customers.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
            title="Nenhum cliente cadastrado"
            message="Cadastre seu primeiro cliente para começar"
            buttonLabel="+ Novo Cliente"
            onAction={handleOpenNew}
          />
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum resultado</p>
            <p className="text-sm text-gray-500 mt-1">Nenhum cliente encontrado para &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <>
          <div className="grid gap-3">
            {paginatedPage.content.map((customer) => {
              const customerReports = reportCountMap[customer.id] ?? []
              const initials = getInitials(customer.data.name)
              const avatarColor = getAvatarColor(customer.data.name || customer.id)

              return (
                <ListCard
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  avatar={
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-sm`}>
                      <span className="text-sm font-semibold text-white tracking-wide">{initials}</span>
                    </div>
                  }
                  title={customer.data.name || 'Cliente sem nome'}
                  pills={
                    <>
                      {customer.data.cpf && <ListCardPill><span className="font-mono">{customer.data.cpf}</span></ListCardPill>}
                      {customer.data.phone && <ListCardPill>{customer.data.phone}</ListCardPill>}
                      {customer.data.birthDate && <ListCardPill>{calculateAge(customer.data.birthDate, true)}</ListCardPill>}
                    </>
                  }
                  badges={
                    <>
                      <ListCardBadge
                        variant={customerReports.length > 0 ? 'brand' : 'default'}
                        icon={
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        }
                      >
                        {customerReports.length}
                      </ListCardBadge>
                      <span className="text-xs text-gray-400">{formatDateTime(customer.updatedAt)}</span>
                    </>
                  }
                  actions={
                    <>
                      <ListCardAction onClick={() => handleCreateReport(customer)} title="Novo relatório" icon={<DocumentPlusIcon />} variant="brand" />
                      <ListCardAction onClick={() => handleOpenEdit(customer)} title="Editar" icon={<EditIcon />} />
                      <ListCardAction onClick={() => setConfirmDeleteId(customer.id)} title="Excluir" icon={<TrashIcon />} variant="danger" />
                    </>
                  }
                />
              )
            })}
          </div>
          <Pagination
            page={paginatedPage}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </main>

      {/* Customer Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingCustomer(null) }}
        title={editingCustomer?.createdAt === editingCustomer?.updatedAt && !customers.find(p => p.id === editingCustomer?.id) ? 'Novo Cliente' : 'Editar Cliente'}
        size="lg"
      >
        {editingCustomer && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={editingCustomer.data.name}
                onChange={(e) => updateEditingField('name', e.target.value)}
                placeholder="Nome completo do cliente"
              />
              <Input
                label="CPF"
                value={editingCustomer.data.cpf}
                onChange={(e) => updateEditingField('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
              <Input
                label="Data de Nascimento"
                type="date"
                value={editingCustomer.data.birthDate}
                onChange={(e) => updateEditingField('birthDate', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  {calculateAge(editingCustomer.data.birthDate) || '\u2014'}
                </div>
              </div>
              <Input
                label="Escolaridade"
                value={editingCustomer.data.education}
                onChange={(e) => updateEditingField('education', e.target.value)}
                placeholder="Escolaridade"
              />
              <Input
                label="Profissão"
                value={editingCustomer.data.profession}
                onChange={(e) => updateEditingField('profession', e.target.value)}
                placeholder="Profissão"
              />
              <Input
                label="Nome da Mãe"
                value={editingCustomer.data.motherName}
                onChange={(e) => updateEditingField('motherName', e.target.value)}
                placeholder="Nome da mãe"
              />
              <Input
                label="Nome do Pai"
                value={editingCustomer.data.fatherName}
                onChange={(e) => updateEditingField('fatherName', e.target.value)}
                placeholder="Nome do pai"
              />
              <Input
                label="Responsável Legal (opcional)"
                value={editingCustomer.data.guardianName ?? ''}
                onChange={(e) => updateEditingField('guardianName', e.target.value)}
                placeholder="Nome do responsável"
              />
              <Input
                label="Grau de Parentesco"
                value={editingCustomer.data.guardianRelationship ?? ''}
                onChange={(e) => updateEditingField('guardianRelationship', e.target.value)}
                placeholder="Ex: Avó, Tio, Tutor"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="ghost" onClick={() => { setShowFormModal(false); setEditingCustomer(null) }}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        message="Tem certeza de que deseja excluir este cliente? Esta ação não pode ser desfeita."
      />
    </>
  )
}
