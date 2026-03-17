import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Customer, CustomerData, Report } from '@/types'
import { createEmptyCustomer } from '@/types'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/api/customer-api'
import { getReports } from '@/lib/api/report-api'
import { formatDateTime } from '@/lib/utils'
import { createReportFromCustomer } from '@/lib/report-utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import { useError } from '@/contexts/ErrorContext'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'

export default function CustomerList() {
  const navigate = useNavigate()
  const { showError } = useError()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [search, setSearch] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  // Count reports per customer
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

  // Reset page when search changes
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
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
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
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Nenhum cliente encontrado para "{search}"</p>
          </div>
        ) : (
          /* Customer list */
          <>
          <div className="space-y-3">
            {paginatedPage.content.map((customer) => {
              const customerReports = reportCountMap[customer.id] ?? []
              const isExpanded = expandedId === customer.id

              return (
                <div key={customer.id} className="bg-white rounded-xl border border-gray-200 transition-all hover:border-brand-300 hover:shadow-sm cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                  {/* Card row */}
                  <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-brand-700">
                        {customer.data.name ? customer.data.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {customer.data.name || 'Cliente sem nome'}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        {customer.data.cpf && (
                          <>
                            <span className="text-xs text-gray-500">{customer.data.cpf}</span>
                            <span className="text-xs text-gray-400">·</span>
                          </>
                        )}
                        {customer.data.birthDate && (
                          <>
                            <span className="text-xs text-gray-500">{customer.data.age || customer.data.birthDate}</span>
                            <span className="text-xs text-gray-400">·</span>
                          </>
                        )}
                        <span className="text-xs text-gray-400">
                          Atualizado {formatDateTime(customer.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Reports badge */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : customer.id) }}
                      className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                        customerReports.length > 0
                          ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      title={customerReports.length > 0 ? 'Ver relatórios vinculados' : 'Nenhum relatório vinculado'}
                    >
                      {customerReports.length} {customerReports.length === 1 ? 'relatório' : 'relatórios'}
                    </button>

                    {/* Actions */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCreateReport(customer) }}
                        className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                        title="Novo relatório para este cliente"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(customer) }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Editar cliente"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteId(customer.id)
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir cliente"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded reports list */}
                  {isExpanded && customerReports.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 rounded-b-xl">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Relatórios vinculados
                      </p>
                      <div className="space-y-1.5">
                        {customerReports
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map((report) => (
                            <button
                              key={report.id}
                              type="button"
                              onClick={() => navigate(`/reports/${report.id}`)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-colors text-left"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span className="text-sm text-gray-700 flex-1 truncate">
                                {report.customerName || 'Sem nome'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                report.status === 'finalizado'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {report.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(report.updatedAt)}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
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
          <div className="p-4 space-y-4">
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
              <Input
                label="Idade"
                value={editingCustomer.data.age}
                onChange={(e) => updateEditingField('age', e.target.value)}
                placeholder="Ex: 32 anos e 4 meses"
              />
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
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
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
