import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { PublicFormData, FormFieldAnswer } from '@/types'
import { createEmptyFormFieldAnswer } from '@/types'
import { getPublicForm, submitPublicForm } from '@/lib/api/public-form-api'
import { useFormValidation } from '@/lib/hooks/use-form-validation'
import { useSortedFields } from '@/lib/hooks/use-sorted-fields'
import FormFieldRenderer from '@/components/form-fill/FormFieldRenderer'

type PageState = 'loading' | 'form' | 'success' | 'error'

export default function PublicFormFill() {
  const { token } = useParams<{ token: string }>()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [formData, setFormData] = useState<PublicFormData | null>(null)
  const [answers, setAnswers] = useState<FormFieldAnswer[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    getPublicForm(token)
      .then((data) => {
        setFormData(data)
        const initialAnswers = data.fields
          .filter((f) => f.type !== 'section-header')
          .map((f) => createEmptyFormFieldAnswer(f.id))
        setAnswers(initialAnswers)
        setPageState('form')
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail || err?.response?.data?.message
        if (detail) {
          setErrorMessage(detail)
        } else {
          setErrorMessage('Este link não é válido ou já expirou.')
        }
        setPageState('error')
      })
  }, [token])

  const { validationErrors, validate, clearFieldError } = useFormValidation(
    useCallback(() => formData?.fields ?? [], [formData]),
    useCallback(() => answers, [answers]),
  )

  const handleAnswerChange = useCallback((answer: FormFieldAnswer) => {
    setAnswers((prev) => {
      const exists = prev.find((a) => a.fieldId === answer.fieldId)
      if (exists) return prev.map((a) => (a.fieldId === answer.fieldId ? answer : a))
      return [...prev, answer]
    })
    clearFieldError(answer.fieldId)
  }, [clearFieldError])

  const handleSubmit = useCallback(async () => {
    if (!validate() || !token || !formData || submitting) return

    setSubmitting(true)
    try {
      await submitPublicForm(token, formData.customerName ?? '', answers)
      setPageState('success')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErrorMessage(detail || 'Erro ao enviar respostas. Tente novamente.')
      setPageState('error')
    } finally {
      setSubmitting(false)
    }
  }, [validate, token, formData, answers, submitting])

  const { sectionGroups } = useSortedFields(formData?.fields)

  const getAnswer = useCallback((fieldId: string): FormFieldAnswer => {
    return answers.find((a) => a.fieldId === fieldId)
      ?? createEmptyFormFieldAnswer(fieldId)
  }, [answers])

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#f0ebf8]/40 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-[#f0ebf8]/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v4m0 4h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link indisponível</h1>
          <p className="text-sm text-gray-500 leading-relaxed">{errorMessage}</p>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-[#f0ebf8]/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M6 10l3 3 5-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="8" stroke="#22C55E" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Respostas enviadas!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Obrigado por preencher o formulário. Suas respostas foram registradas com sucesso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0ebf8]/40">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30 h-16">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-gray-700 truncate">
              {formData?.formTitle || 'Formulário'}
            </h1>
            {formData?.customerName && (
              <p className="text-xs text-gray-400 truncate">{formData.customerName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-6 space-y-3">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-2 bg-brand-500" />
          <div className="px-6 py-5">
            <h1 className="text-2xl font-normal text-gray-900">
              {formData?.formTitle || 'Formulário'}
            </h1>
            {formData?.formDescription && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{formData.formDescription}</p>
            )}
            {formData?.customerName && (
              <p className="text-sm text-gray-400 mt-3">
                Paciente: <span className="text-gray-600 font-medium">{formData.customerName}</span>
              </p>
            )}
          </div>
        </div>

        {sectionGroups.map((group) => (
          <div key={group.sectionFieldId}>
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

        <div className="flex items-center justify-center pt-6 pb-10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-10 py-3 rounded-full bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando...' : 'Enviar Respostas'}
          </button>
        </div>
      </main>
    </div>
  )
}
