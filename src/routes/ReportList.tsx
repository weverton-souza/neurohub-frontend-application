import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Report, ReportTemplate, Block } from '@/types'
import { getReports, createReport, deleteReport } from '@/lib/api/report-api'
import { getReportTemplates, deleteReportTemplate } from '@/lib/api/template-api'
import { getAllTemplates } from '@/lib/default-templates'
import { formatDateTime } from '@/lib/utils'
import { createEmptyReport } from '@/lib/report-utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import { useError } from '@/contexts/ErrorContext'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import ListCard, { ListCardPill, ListCardAction, TrashIcon } from '@/components/ui/ListCard'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'

export default function ReportList() {
  const navigate = useNavigate()
  const { showError } = useError()

  const [reports, setReports] = useState<Report[]>([])
  const [customTemplates, setCustomTemplates] = useState<ReportTemplate[]>([])
  const [showNewModal, setShowNewModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [reportsPage, templates] = await Promise.all([
        getReports(0, 100),
        getReportTemplates(),
      ])
      setReports(reportsPage.content)
      setCustomTemplates(templates)
    } catch (err) {
      showError(err)
    }
  }, [showError])

  useEffect(() => { loadData() }, [loadData])

  const allTemplates = getAllTemplates(customTemplates)

  const handleCreateFromScratch = useCallback(async () => {
    try {
      const report = await createEmptyReport()
      setShowNewModal(false)
      navigate(`/reports/${report.id}`)
    } catch (err) {
      showError(err)
    }
  }, [navigate, showError])

  const handleCreateFromTemplate = useCallback(
    async (template: ReportTemplate) => {
      try {
        const blocks: Block[] = template.blocks.map((tb) => ({
          id: crypto.randomUUID(),
          type: tb.type,
          order: tb.order,
          data: JSON.parse(JSON.stringify(tb.data)),
          collapsed: false,
        }))

        const report = await createReport({
          status: 'rascunho',
          customerName: '',
          blocks,
        })

        setShowNewModal(false)
        navigate(`/reports/${report.id}`)
      } catch (err) {
        showError(err)
      }
    },
    [navigate, showError]
  )

  const handleDeleteReport = useCallback(async (id: string) => {
    try {
      await deleteReport(id)
      await loadData()
    } catch (err) {
      showError(err)
    }
  }, [loadData, showError])

  const { confirmId: confirmDeleteId, requestDelete: setConfirmDeleteId, confirmDelete, cancelDelete } = useConfirmDelete(handleDeleteReport)

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      try {
        await deleteReportTemplate(id)
        const templates = await getReportTemplates()
        setCustomTemplates(templates)
      } catch (err) {
        showError(err)
      }
    },
    [showError]
  )

  const sortedReports = useMemo(
    () => [...reports].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    [reports]
  )

  const { page: paginatedPage, setCurrentPage, pageSize, changePageSize } = usePagination(sortedReports)

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Montagem de relatórios"
        actions={
          <Button onClick={() => setShowNewModal(true)}>+ Novo Relatório</Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        {reports.length > 0 && (
          <div className="mb-6 hidden sm:flex items-center justify-end">
            <div className="flex items-center gap-1.5">
              <label htmlFor="page-size-reports" className="text-sm text-gray-400">
                Por página:
              </label>
              <select
                id="page-size-reports"
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

        {reports.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="18" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Nenhum relatório ainda"
            message="Crie seu primeiro relatório para começar"
            buttonLabel="+ Novo Relatório"
            onAction={() => setShowNewModal(true)}
          />
        ) : (
          /* Report list */
          <>
          <div className="space-y-3">
            {paginatedPage.content.map((report) => (
              <ListCard
                key={report.id}
                onClick={() => navigate(`/reports/${report.id}`)}
                title={report.customerName || 'Cliente sem nome'}
                pills={
                  <>
                    <ListCardPill>{formatDateTime(report.updatedAt)}</ListCardPill>
                    <ListCardPill>{report.blocks.length} {report.blocks.length === 1 ? 'bloco' : 'blocos'}</ListCardPill>
                  </>
                }
                badges={<StatusBadge status={report.status} />}
                actions={
                  <ListCardAction
                    onClick={() => setConfirmDeleteId(report.id)}
                    title="Excluir relatório"
                    icon={<TrashIcon />}
                    variant="danger"
                  />
                }
              />
            ))}
          </div>
          <Pagination
            page={paginatedPage}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </main>

      {/* New Report Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Relatório"
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
                Relatório vazio com bloco de identificação
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

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        message="Tem certeza de que deseja excluir este relatório? Esta ação não pode ser desfeita."
      />
    </>
  )
}
