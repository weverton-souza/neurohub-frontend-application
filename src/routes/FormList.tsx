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
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/layout/PageHeader'
import ListCard, { ListCardPill, ListCardAction, TrashIcon, CopyIcon } from '@/components/ui/ListCard'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import EmptyState from '@/components/ui/EmptyState'

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
      navigate(`/forms/${created.id}/edit`)
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
        options: (f.options ?? []).map(o => ({ ...o, id: crypto.randomUUID() })),
      }))
      dup.linkedTemplateId = form.linkedTemplateId
      dup.fieldMappings = form.fieldMappings
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
          <div className="mb-6 hidden sm:flex items-center justify-end">
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
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            }
            title="Nenhum formulário ainda"
            message="Crie seu primeiro formulário de anamnese"
            buttonLabel="+ Novo Formulário"
            onAction={handleCreate}
          />
        ) : (
          <>
            <div className="space-y-3">
              {paginatedPage.content.map((form) => {
                const templateName = getTemplateName(form.linkedTemplateId)
                const responseCount = responseCounts[form.id] ?? 0
                const isDefault = !!form.isDefault
                const questionCount = form.fields.filter(f => f.type !== 'section-header').length

                return (
                  <ListCard
                    key={form.id}
                    onClick={() =>
                      isDefault
                        ? navigate(`/forms/${form.id}/responses`)
                        : navigate(`/forms/${form.id}/edit`)
                    }
                    title={form.title || 'Formulário sem título'}
                    pills={
                      <>
                        {isDefault && (
                          <ListCardPill>Padrão</ListCardPill>
                        )}
                        {!isDefault && (
                          <ListCardPill>{formatDateTime(form.updatedAt)}</ListCardPill>
                        )}
                        <ListCardPill>{questionCount} {questionCount === 1 ? 'pergunta' : 'perguntas'}</ListCardPill>
                        {templateName && (
                          <span className="inline-flex items-center text-[10px] font-medium uppercase bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full">
                            {templateName}
                          </span>
                        )}
                      </>
                    }
                    badges={
                      <>
                        {isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/forms/${form.id}/fill`)
                            }}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                          >
                            Preencher
                          </button>
                        )}
                        <div
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/forms/${form.id}/responses`)
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
                      </>
                    }
                    actions={
                      <>
                        <ListCardAction onClick={() => handleDuplicate(form)} title="Duplicar" icon={<CopyIcon />} />
                        {!isDefault && (
                          <ListCardAction onClick={() => setConfirmDeleteId(form.id)} title="Excluir" icon={<TrashIcon />} variant="danger" />
                        )}
                      </>
                    }
                  />
                )
              })}
            </div>
            <Pagination page={paginatedPage} onPageChange={setCurrentPage} />
          </>
        )}
      </main>

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteId}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        message="Tem certeza de que deseja excluir este formulário e todas as suas respostas? Esta ação não pode ser desfeita."
      />
    </>
  )
}
