import { useState, useCallback } from 'react'
import type { FormField, FormFieldAnswer } from '@/types'

export function useFormValidation(
  getFields: () => FormField[],
  getAnswers: () => FormFieldAnswer[],
) {
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())

  const validate = useCallback((): boolean => {
    const fields = getFields()
    const answers = getAnswers()
    const errors = new Set<string>()

    for (const field of fields) {
      if (!field.required || field.type === 'section-header') continue

      const answer = answers.find((a) => a.fieldId === field.id)
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
  }, [getFields, getAnswers])

  const clearFieldError = useCallback((fieldId: string) => {
    if (validationErrors.has(fieldId)) {
      setValidationErrors((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    }
  }, [validationErrors])

  return { validationErrors, validate, clearFieldError }
}
