import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Patient, PatientData, Laudo } from '@/types'
import { createEmptyPatientRecord } from '@/types'
import {
  getPatients,
  savePatient,
  deletePatient,
  getLaudos,
} from '@/lib/storage'
import { formatDateTime } from '@/lib/utils'
import { createLaudoFromPatient } from '@/lib/laudo-utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'

export default function PatientList() {
  const navigate = useNavigate()

  const [patients, setPatients] = useState<Patient[]>([])
  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [search, setSearch] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setPatients(getPatients())
    setLaudos(getLaudos())
  }, [])

  // Count laudos per patient
  const laudoCountMap = useMemo(() => {
    const map: Record<string, Laudo[]> = {}
    for (const laudo of laudos) {
      if (laudo.patientId) {
        if (!map[laudo.patientId]) map[laudo.patientId] = []
        map[laudo.patientId].push(laudo)
      }
    }
    return map
  }, [laudos])

  const filteredPatients = useMemo(() => {
    const sorted = [...patients].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    if (!search.trim()) return sorted
    const term = search.toLowerCase()
    return sorted.filter(
      (p) =>
        p.data.name.toLowerCase().includes(term) ||
        p.data.cpf.includes(term)
    )
  }, [patients, search])

  const { page: paginatedPage, setCurrentPage, pageSize, changePageSize, resetPage } = usePagination(filteredPatients)

  // Reset page when search changes
  useEffect(() => {
    resetPage()
  }, [search, resetPage])

  const handleOpenNew = useCallback(() => {
    setEditingPatient(createEmptyPatientRecord())
    setShowFormModal(true)
  }, [])

  const handleOpenEdit = useCallback((patient: Patient) => {
    setEditingPatient({ ...patient, data: { ...patient.data } })
    setShowFormModal(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!editingPatient) return
    savePatient(editingPatient)
    setPatients(getPatients())
    setShowFormModal(false)
    setEditingPatient(null)
  }, [editingPatient])

  const handleDeletePatient = useCallback((id: string) => {
    deletePatient(id)
    setPatients(getPatients())
  }, [])

  const { confirmId: confirmDeleteId, requestDelete: setConfirmDeleteId, confirmDelete, cancelDelete } = useConfirmDelete(handleDeletePatient)

  const handleCreateLaudo = useCallback(
    (patient: Patient) => {
      const laudo = createLaudoFromPatient(patient)
      navigate(`/laudo/${laudo.id}`)
    },
    [navigate]
  )

  const updateEditingField = useCallback(
    (field: keyof PatientData, value: string) => {
      if (!editingPatient) return
      setEditingPatient({
        ...editingPatient,
        data: { ...editingPatient.data, [field]: value },
      })
    },
    [editingPatient]
  )

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro de pacientes"
        actions={
          <Button onClick={handleOpenNew}>+ Novo Paciente</Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search + filters */}
        {patients.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
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

        {patients.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Nenhum paciente cadastrado
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Cadastre seu primeiro paciente para começar
            </p>
            <Button onClick={handleOpenNew} size="lg">
              + Novo Paciente
            </Button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Nenhum paciente encontrado para "{search}"</p>
          </div>
        ) : (
          /* Patient list */
          <>
          <div className="space-y-3">
            {paginatedPage.content.map((patient) => {
              const patientLaudos = laudoCountMap[patient.id] ?? []
              const isExpanded = expandedId === patient.id

              return (
                <div key={patient.id} className="bg-white rounded-xl border border-gray-200 transition-all hover:border-brand-300 hover:shadow-sm cursor-pointer" onClick={() => navigate(`/pacientes/${patient.id}`)}>
                  {/* Card row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-brand-700">
                        {patient.data.name ? patient.data.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {patient.data.name || 'Paciente sem nome'}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        {patient.data.cpf && (
                          <>
                            <span className="text-xs text-gray-500">{patient.data.cpf}</span>
                            <span className="text-xs text-gray-400">·</span>
                          </>
                        )}
                        {patient.data.birthDate && (
                          <>
                            <span className="text-xs text-gray-500">{patient.data.age || patient.data.birthDate}</span>
                            <span className="text-xs text-gray-400">·</span>
                          </>
                        )}
                        <span className="text-xs text-gray-400">
                          Atualizado {formatDateTime(patient.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Laudos badge */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : patient.id) }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                        patientLaudos.length > 0
                          ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      title={patientLaudos.length > 0 ? 'Ver laudos vinculados' : 'Nenhum laudo vinculado'}
                    >
                      {patientLaudos.length} {patientLaudos.length === 1 ? 'laudo' : 'laudos'}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCreateLaudo(patient) }}
                        className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                        title="Novo laudo para este paciente"
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
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient) }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Editar paciente"
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
                          setConfirmDeleteId(patient.id)
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir paciente"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded laudos list */}
                  {isExpanded && patientLaudos.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 rounded-b-xl">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Laudos vinculados
                      </p>
                      <div className="space-y-1.5">
                        {patientLaudos
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map((laudo) => (
                            <button
                              key={laudo.id}
                              type="button"
                              onClick={() => navigate(`/laudo/${laudo.id}`)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-colors text-left"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span className="text-sm text-gray-700 flex-1 truncate">
                                {laudo.patientName || 'Sem nome'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                laudo.status === 'finalizado'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {laudo.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(laudo.updatedAt)}
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

      {/* Patient Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingPatient(null) }}
        title={editingPatient?.createdAt === editingPatient?.updatedAt && !getPatients().find(p => p.id === editingPatient?.id) ? 'Novo Paciente' : 'Editar Paciente'}
        size="lg"
      >
        {editingPatient && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={editingPatient.data.name}
                onChange={(e) => updateEditingField('name', e.target.value)}
                placeholder="Nome completo do paciente"
              />
              <Input
                label="CPF"
                value={editingPatient.data.cpf}
                onChange={(e) => updateEditingField('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
              <Input
                label="Data de Nascimento"
                type="date"
                value={editingPatient.data.birthDate}
                onChange={(e) => updateEditingField('birthDate', e.target.value)}
              />
              <Input
                label="Idade"
                value={editingPatient.data.age}
                onChange={(e) => updateEditingField('age', e.target.value)}
                placeholder="Ex: 32 anos e 4 meses"
              />
              <Input
                label="Escolaridade"
                value={editingPatient.data.education}
                onChange={(e) => updateEditingField('education', e.target.value)}
                placeholder="Escolaridade"
              />
              <Input
                label="Profissão"
                value={editingPatient.data.profession}
                onChange={(e) => updateEditingField('profession', e.target.value)}
                placeholder="Profissão"
              />
              <Input
                label="Nome da Mãe"
                value={editingPatient.data.motherName}
                onChange={(e) => updateEditingField('motherName', e.target.value)}
                placeholder="Nome da mãe"
              />
              <Input
                label="Nome do Pai"
                value={editingPatient.data.fatherName}
                onChange={(e) => updateEditingField('fatherName', e.target.value)}
                placeholder="Nome do pai"
              />
              <Input
                label="Responsável Legal (opcional)"
                value={editingPatient.data.guardianName ?? ''}
                onChange={(e) => updateEditingField('guardianName', e.target.value)}
                placeholder="Nome do responsável"
              />
              <Input
                label="Grau de Parentesco"
                value={editingPatient.data.guardianRelationship ?? ''}
                onChange={(e) => updateEditingField('guardianRelationship', e.target.value)}
                placeholder="Ex: Avó, Tio, Tutor"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => { setShowFormModal(false); setEditingPatient(null) }}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        title="Confirmar exclusão"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza de que deseja excluir este paciente? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancelDelete}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
