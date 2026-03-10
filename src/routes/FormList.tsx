import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Form } from '@/types'
import { createEmptyForm } from '@/types'
import { listForms, createForm, deleteForm, listFormResponses } from '@/lib/api/form-api'
import { getAllTemplates } from '@/lib/default-templates'
import { getReportTemplates } from '@/lib/api/template-api'
import { formatDateTime } from '@/lib/utils'
import { useConfirmDelete } from '@/lib/hooks/use-confirm-delete'
import { usePagination } from '@/lib/hooks/use-pagination'
import { useError } from '@/contexts/ErrorContext'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'

export default function FormList() {
  const navigate = useNavigate()
  const { showError } = useError()

  const [forms, setForms] = useState<Form[]>([])
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({})
  const [templates, setTemplates] = useState(() => getAllTemplates([]))

  const loadData = useCallback(async () => {
    try {
      const [loadedForms, customTemplates] = await Promise.all([
        listForms(),
        getReportTemplates(),
      ])
      setForms(loadedForms)
      setTemplates(getAllTemplates(customTemplates))

      // Count responses per form
      const counts: Record<string, number> = {}
      const countResults = await Promise.all(
        loadedForms.map(async (f) => {
          const responses = await listFormResponses(f.id)
          return { formId: f.id, count: responses.length }
        })
      )
      for (const { formId, count } of countResults) {
        counts[formId] = count
      }
      setResponseCounts(counts)
    } catch (err) {
      showError(err)
    }
  }, [showError])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(async () => {
    try {
      const form = createEmptyForm()
      form.title = 'Novo Formulário'
      const created = await createForm(form)
      navigate(`/formulario/${created.id}/editar`)
    } catch (err) {
      showError(err)
    }
  }, [navigate, showError])

  const handleDeleteForm = useCallback(async (id: string) => {
    try {
      await deleteForm(id)
      await loadData()
    } catch (err) {
      showError(err)
    }
  }, [loadData, showError])

  const { confirmId: confirmDeleteId, requestDelete: setConfirmDeleteId, confirmDelete, cancelDelete } = useConfirmDelete(handleDeleteForm)

  const handleDuplicate = useCallback(async (form: Form) => {
    try {
      const dup = createEmptyForm()
      dup.title = `${form.title} (cópia)`
      dup.description = form.description
      dup.fields = form.fields.map(f => ({
        ...f,
        id: crypto.randomUUID(),
        options: f.options.map(o => ({ ...o, id: crypto.randomUUID() })),
      }))
      dup.linkedTemplateId = form.linkedTemplateId
      dup.fieldMappings = form.fieldMappings.map(m => ({ ...m }))
      await createForm(dup)
      await loadData()
    } catch (err) {
      showError(err)
    }
  }, [loadData, showError])

  const getTemplateName = (templateId: string | null): string | null => {
    if (!templateId) return null
    return templates.find(t => t.id === templateId)?.name ?? null
  }

  const { page: paginatedPage, setCurrentPage, pageSize, changePageSize } = usePagination(forms)

  return (
    <>
      <PageHeader
        title="Formulários"
        subtitle="Anamnese e questionários para clientes"
        actions={
          <Button onClick={handleCreate}>+ Novo Formulário</Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page size */}
        {forms.length > 0 && (
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-1.5">
              <label htmlFor="page-size-forms" className="text-sm text-gray-400">
                Por página:
              </label>
              <select
                id="page-size-forms"
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

        {forms.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Nenhum formulário ainda
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Crie seu primeiro formulário de anamnese
            </p>
            <Button onClick={handleCreate} size="lg">
              + Novo Formulário
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedPage.content.map((form) => {
                const templateName = getTemplateName(form.linkedTemplateId)
                const responseCount = responseCounts[form.id] ?? 0
                const isDefault = !!form.isDefault

                return (
                  <div
                    key={form.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() =>
                      isDefault
                        ? navigate(`/formulario/${form.id}/respostas`)
                        : navigate(`/formulario/${form.id}/editar`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {form.title || 'Formulário sem título'}
                        </h3>
                        {isDefault && (
                          <span className="text-[10px] font-medium uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                            Padrão
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {!isDefault && (
                          <>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(form.updatedAt)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                          </>
                        )}
                        <span className="text-xs text-gray-500">
                          {form.fields.filter(f => f.type !== 'section-header').length} {form.fields.filter(f => f.type !== 'section-header').length === 1 ? 'pergunta' : 'perguntas'}
                        </span>
                        {templateName && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-[10px] font-medium uppercase bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                              {templateName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick fill button for default forms */}
                    {isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/formulario/${form.id}/preencher`)
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                      >
                        Preencher
                      </button>
                    )}

                    {/* Response count badge */}
                    <div
                      className="shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/formulario/${form.id}/respostas`)
                      }}
                    >
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
                        responseCount > 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {responseCount} {responseCount === 1 ? 'resposta' : 'respostas'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(form)
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Duplicar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteId(form.id)
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={paginatedPage} onPageChange={setCurrentPage} />
          </>
        )}
      </main>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        title="Confirmar exclusão"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza de que deseja excluir este formulário e todas as suas respostas? Esta ação não pode ser desfeita.
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
