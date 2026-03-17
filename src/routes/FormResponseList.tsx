import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Form, FormResponse, ReportTemplate } from '@/types'
import { FORM_RESPONSE_STATUS_LABELS, FORM_RESPONSE_STATUS_COLORS } from '@/types'
import { getFormById, listFormResponses, deleteFormResponse } from '@/lib/api/form-api'
import { getAllTemplates } from '@/lib/default-templates'
import { getReportTemplates } from '@/lib/api/template-api'
import { useError } from '@/contexts/ErrorContext'
import { formatDateTime } from '@/lib/utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'
import GenerateReportModal from '@/components/form-builder/GenerateReportModal'
import GenerateFormLinkModal from '@/components/form-builder/GenerateFormLinkModal'

export default function FormResponseList() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useError()

  const [form, setForm] = useState<Form | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [generateForResponse, setGenerateForResponse] = useState<FormResponse | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [allTemplates, setAllTemplates] = useState(() => getAllTemplates([]))

  const linkedTemplate = useMemo((): ReportTemplate | null => {
    if (!form?.linkedTemplateId) return null
    return allTemplates.find((t) => t.id === form.linkedTemplateId) ?? null
  }, [form, allTemplates])

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [loadedForm, loadedResponses, customTemplates] = await Promise.all([
        getFormById(id),
        listFormResponses(id),
        getReportTemplates(),
      ])
      if (!loadedForm) {
        navigate('/forms')
        return
      }
      setForm(loadedForm)
      setResponses(loadedResponses)
      setAllTemplates(getAllTemplates(customTemplates))
    } catch (err) {
      showError(err)
    }
  }, [id, navigate, showError])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteResponse = useCallback(async (responseId: string) => {
    try {
      if (!id) return
      await deleteFormResponse(id, responseId)
      await loadData()
    } catch (err) {
      showError(err)
    }
  }, [id, loadData, showError])

  const { confirmId: confirmDeleteId, requestDelete: setConfirmDeleteId, confirmDelete, cancelDelete } = useConfirmDelete(handleDeleteResponse)
  const { page: paginatedPage, setCurrentPage, pageSize, changePageSize } = usePagination(responses)

  const handleNewResponse = useCallback(() => {
    navigate(`/forms/${id}/fill`)
  }, [id, navigate])

  if (!form) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={`Respostas — ${form.title || 'Formulário'}`}
        subtitle={`${responses.length} ${responses.length === 1 ? 'resposta' : 'respostas'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/forms/${id}/edit`)}>
              Editar Formulário
            </Button>
            <Button variant="ghost" onClick={() => setShowLinkModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 mr-1">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Gerar Link
            </Button>
            <Button onClick={handleNewResponse}>
              + Nova Resposta
            </Button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page size */}
        {responses.length > 0 && (
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-1.5">
              <label htmlFor="page-size-responses" className="text-sm text-gray-400">
                Por página:
              </label>
              <select
                id="page-size-responses"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              >
                {[10, 25, 50].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {responses.length === 0 ? (
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
            title="Nenhuma resposta ainda"
            message="Inicie o preenchimento do formulário para um cliente"
            buttonLabel="+ Nova Resposta"
            onAction={handleNewResponse}
          />
        ) : (
          <>
            <div className="space-y-3">
              {paginatedPage.content.map((resp) => (
                <div
                  key={resp.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => navigate(`/forms/${id}/fill?response=${resp.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {resp.customerName || 'Cliente sem nome'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatDateTime(resp.updatedAt)}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {resp.answers.filter(a => a.value || a.selectedOptionIds.length > 0 || a.scaleValue !== null).length} de {form.fields.filter(f => f.type !== 'section-header').length} respondidas
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                    FORM_RESPONSE_STATUS_COLORS[resp.status].bg
                  } ${FORM_RESPONSE_STATUS_COLORS[resp.status].text}`}>
                    {FORM_RESPONSE_STATUS_LABELS[resp.status]}
                  </span>

                  {/* Generated report indicator or generate button */}
                  {resp.generatedReportId ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/reports/${resp.generatedReportId}`)
                      }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                    >
                      Ver Relatório
                    </button>
                  ) : resp.status === 'concluido' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setGenerateForResponse(resp)
                      }}
                      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Gerar Relatório
                    </button>
                  ) : null}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDeleteId(resp.id)
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    title="Excluir resposta"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={paginatedPage} onPageChange={setCurrentPage} />
          </>
        )}
      </main>

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        message="Tem certeza de que deseja excluir esta resposta? Esta ação não pode ser desfeita."
      />

      {/* Generate Form Link Modal */}
      {id && (
        <GenerateFormLinkModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          formId={id}
        />
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={!!generateForResponse}
        onClose={() => setGenerateForResponse(null)}
        form={form}
        response={generateForResponse}
        template={linkedTemplate}
        onReportGenerated={(reportId) => {
          setGenerateForResponse(null)
          navigate(`/reports/${reportId}`)
        }}
      />
    </>
  )
}
