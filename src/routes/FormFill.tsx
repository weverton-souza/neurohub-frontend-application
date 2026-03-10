import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { Form, FormResponse, FormFieldAnswer } from '@/types'
import { createEmptyFormResponse, createEmptyFormFieldAnswer } from '@/types'
import {
  getFormById,
  getFormResponseById,
  createFormResponse,
  updateFormResponse,
} from '@/lib/api/form-api'
import { getCustomer } from '@/lib/api/customer-api'
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { buildFormSectionGroups } from '@/lib/utils'
import FormFieldRenderer from '@/components/form-fill/FormFieldRenderer'

export default function FormFill() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState<Form | null>(null)
  const [response, setResponse] = useState<FormResponse | null>(null)
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())

  const updateResponseFn = useCallback(
    (data: FormResponse) => id ? updateFormResponse(id, data) : Promise.resolve(data),
    [id],
  )
  const { saveStatus, scheduleSave, forceSave } = useAutoSave<FormResponse>(updateResponseFn)
  const responseIdParam = searchParams.get('response')
  const customerIdParam = searchParams.get('customer')

  // Load form
  useEffect(() => {
    if (!id) return

    getFormById(id).then(async (loadedForm) => {
      if (!loadedForm) {
        navigate('/formularios')
        return
      }
      setForm(loadedForm)

      // Load or create response
      if (responseIdParam) {
        try {
          const existing = await getFormResponseById(id, responseIdParam)
          if (existing) {
            setResponse(existing)
            return
          }
        } catch {
          // response not found, create new
        }
      }

      // Create new response
      const newResponse = createEmptyFormResponse(loadedForm.id)

      // Pre-fill customer if param provided
      if (customerIdParam) {
        try {
          const customer = await getCustomer(customerIdParam)
          if (customer) {
            newResponse.customerId = customer.id
            newResponse.customerName = customer.data.name
          }
        } catch {
          // customer not found
        }
      }

      // Initialize answers for all fields
      newResponse.answers = loadedForm.fields
        .filter((f) => f.type !== 'section-header')
        .map((f) => createEmptyFormFieldAnswer(f.id))

      const created = await createFormResponse(id, newResponse)
      setResponse(created)
    })
  }, [id, navigate, responseIdParam, customerIdParam])

  const updateResponseState = useCallback((patch: Partial<FormResponse>) => {
    setResponse((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  const handleAnswerChange = useCallback((answer: FormFieldAnswer) => {
    if (!response) return
    const answers = response.answers.map((a) =>
      a.fieldId === answer.fieldId ? answer : a
    )
    // If field didn't exist yet, add it
    if (!answers.find((a) => a.fieldId === answer.fieldId)) {
      answers.push(answer)
    }
    updateResponseState({ answers })

    // Clear validation error
    if (validationErrors.has(answer.fieldId)) {
      setValidationErrors((prev) => {
        const next = new Set(prev)
        next.delete(answer.fieldId)
        return next
      })
    }
  }, [response, updateResponseState, validationErrors])

  const handleCustomerNameChange = useCallback((name: string) => {
    updateResponseState({ customerName: name })
  }, [updateResponseState])

  const validate = useCallback((): boolean => {
    if (!form || !response) return false
    const errors = new Set<string>()

    for (const field of form.fields) {
      if (!field.required || field.type === 'section-header') continue

      const answer = response.answers.find((a) => a.fieldId === field.id)
      if (!answer) {
        errors.add(field.id)
        continue
      }

      const isEmpty =
        (field.type === 'short-text' || field.type === 'long-text' || field.type === 'date' || field.type === 'yes-no')
          ? !answer.value.trim()
        : (field.type === 'single-choice' || field.type === 'multiple-choice')
          ? answer.selectedOptionIds.length === 0
        : field.type === 'scale'
          ? answer.scaleValue === null
        : false

      if (isEmpty) errors.add(field.id)
    }

    setValidationErrors(errors)
    return errors.size === 0
  }, [form, response])

  const handleFinalize = useCallback(async () => {
    if (!validate() || !response) return

    const finalized = { ...response, status: 'concluido' as const }
    await forceSave(finalized)
    setResponse(finalized)

    navigate(`/formulario/${id}/respostas`)
  }, [validate, response, id, navigate, forceSave])

  const handleSaveDraft = useCallback(async () => {
    if (!response) return
    await forceSave(response)
  }, [response, forceSave])

  const handleBack = useCallback(async () => {
    if (response) await forceSave(response)
    navigate(`/formulario/${id}/respostas`)
  }, [response, id, navigate, forceSave])

  // Derived
  const sortedFields = useMemo(
    () => form ? [...form.fields].sort((a, b) => a.order - b.order) : [],
    [form]
  )

  const sectionGroups = useMemo(
    () => buildFormSectionGroups(sortedFields),
    [sortedFields]
  )

  const getAnswer = useCallback((fieldId: string): FormFieldAnswer => {
    return response?.answers.find((a) => a.fieldId === fieldId)
      ?? createEmptyFormFieldAnswer(fieldId)
  }, [response])

  if (!form || !response) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0ebf8]/40">
      {/* Sticky header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30 h-16">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 h-full flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-gray-700 truncate">
              {form.title || 'Formulário sem título'}
            </h1>
          </div>

          {/* Save status */}
          <div className="shrink-0 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              saveStatus === 'saved' ? 'bg-green-400' :
              saveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' :
              'bg-gray-300'
            }`} />
            <span className="text-xs text-gray-400">
              {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo' : ''}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-6 space-y-3">
        {/* Form title card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-2 bg-brand-500" />
          <div className="px-6 py-5">
            <h1 className="text-2xl font-normal text-gray-900">
              {form.title || 'Formulário sem título'}
            </h1>
            {form.description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{form.description}</p>
            )}
          </div>
        </div>

        {/* Customer name */}
        <div className="bg-white rounded-lg shadow-sm px-6 py-5">
          <label className="block text-sm text-gray-900 mb-1">
            Nome do cliente <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={response.customerName}
            onChange={(e) => handleCustomerNameChange(e.target.value)}
            placeholder="Nome completo do cliente"
            className="w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-0 focus:outline-none transition-colors"
          />
        </div>

        {/* Fields grouped by section */}
        {sectionGroups.map((group) => (
          <div key={group.sectionFieldId}>
            {/* Section header card */}
            {group.sectionField && (
              <div className="pt-4">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="h-1.5 bg-brand-400" />
                  <div className="px-6 py-4">
                    <h2 className="text-base font-medium text-gray-800">
                      {group.sectionField.label || 'Seção sem título'}
                    </h2>
                    {group.sectionField.description && (
                      <p className="text-xs text-gray-400 mt-1">{group.sectionField.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Question fields */}
            {group.children.map((field) => {
              const hasError = validationErrors.has(field.id)

              return (
                <div
                  key={field.id}
                  className={`bg-white rounded-lg shadow-sm px-6 py-5 transition-shadow mt-3 ${
                    hasError
                      ? 'ring-1 ring-red-400 shadow-red-100'
                      : 'hover:shadow-md'
                  }`}
                >
                  <label className="block text-sm text-gray-900 mb-3">
                    {field.label || '(pergunta não definida)'}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.description && (
                    <p className="text-xs text-gray-400 mb-4 leading-relaxed">{field.description}</p>
                  )}

                  <FormFieldRenderer
                    field={field}
                    answer={getAnswer(field.id)}
                    onChange={handleAnswerChange}
                  />

                  {hasError && (
                    <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      Este campo é obrigatório
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            className="px-8 py-2.5 rounded-full bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 shadow-sm hover:shadow-md transition-all"
          >
            Enviar
          </button>
        </div>
      </main>
    </div>
  )
}
