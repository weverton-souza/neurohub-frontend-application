import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Laudo,
  LaudoTemplate,
  Block,
} from '@/types'
import {
  getLaudos,
  saveLaudo,
  deleteLaudo,
  getCustomTemplates,
  deleteCustomTemplate,
} from '@/lib/storage'
import { getAllTemplates } from '@/lib/default-templates'
import { createBlock, paginate } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

export default function LaudoList() {
  const navigate = useNavigate()

  const [laudos, setLaudos] = useState<Laudo[]>([])
  const [customTemplates, setCustomTemplates] = useState<LaudoTemplate[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Load data
  useEffect(() => {
    setLaudos(getLaudos())
    setCustomTemplates(getCustomTemplates())
  }, [])

  const allTemplates = getAllTemplates(customTemplates)

  const handleCreateFromScratch = useCallback(() => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const identificationBlock = createBlock('identification', 0)

    const laudo: Laudo = {
      id,
      createdAt: now,
      updatedAt: now,
      status: 'rascunho',
      patientName: '',
      blocks: [identificationBlock],
    }

    saveLaudo(laudo)
    setShowNewModal(false)
    navigate(`/laudo/${id}`)
  }, [navigate])

  const handleCreateFromTemplate = useCallback(
    (template: LaudoTemplate) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const blocks: Block[] = template.blocks.map((tb) => ({
        id: crypto.randomUUID(),
        type: tb.type,
        order: tb.order,
        data: JSON.parse(JSON.stringify(tb.data)),
        collapsed: false,
      }))

      const laudo: Laudo = {
        id,
        createdAt: now,
        updatedAt: now,
        status: 'rascunho',
        patientName: '',
        blocks,
      }

      saveLaudo(laudo)
      setShowNewModal(false)
      navigate(`/laudo/${id}`)
    },
    [navigate]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteLaudo(id)
      setLaudos(getLaudos())
      setConfirmDeleteId(null)
    },
    []
  )

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      deleteCustomTemplate(id)
      setCustomTemplates(getCustomTemplates())
    },
    []
  )

  const sortedLaudos = useMemo(
    () => [...laudos].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    [laudos]
  )

  const paginatedPage = useMemo(
    () => paginate(sortedLaudos, currentPage, pageSize),
    [sortedLaudos, currentPage, pageSize]
  )

  return (
    <>
      <PageHeader
        title="Laudos"
        subtitle="Montagem de laudos"
        actions={
          <Button onClick={() => setShowNewModal(true)}>+ Novo Laudo</Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        {laudos.length > 0 && (
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-1.5">
              <label htmlFor="page-size-laudos" className="text-sm text-gray-400">
                Por página:
              </label>
              <select
                id="page-size-laudos"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(0)
                }}
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

        {laudos.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="18" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Nenhum laudo ainda
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Crie seu primeiro laudo para começar
            </p>
            <Button onClick={() => setShowNewModal(true)} size="lg">
              + Novo Laudo
            </Button>
          </div>
        ) : (
          /* Laudo list */
          <>
          <div className="space-y-3">
            {paginatedPage.content.map((laudo) => (
              <div
                key={laudo.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/laudo/${laudo.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {laudo.patientName || 'Paciente sem nome'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(laudo.updatedAt)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {laudo.blocks.length} {laudo.blocks.length === 1 ? 'bloco' : 'blocos'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={laudo.status} />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDeleteId(laudo.id)
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="Excluir laudo"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <Pagination
            page={paginatedPage}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </main>

      {/* New Laudo Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Laudo"
        size="md"
      >
        <div className="p-4 space-y-4">
          {/* From scratch */}
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
              <p className="text-xs text-gray-500 mt-0.5">
                Laudo vazio com bloco de identificação
              </p>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase font-medium">ou use um template</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Templates */}
          <div className="space-y-2">
            {allTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => handleCreateFromTemplate(template)}
                  className="flex-1 flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left"
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
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {template.blocks.length} blocos
                    </p>
                  </div>
                </button>
                {!template.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    title="Excluir template"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Confirmar exclusão"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza de que deseja excluir este laudo? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
