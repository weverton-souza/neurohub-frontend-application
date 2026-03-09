import { useMemo } from 'react'
import type { FormField } from '@/types'
import { buildFormSectionGroups } from '@/lib/utils'

interface FormPreviewProps {
  title: string
  description: string
  fields: FormField[]
}

export default function FormPreview({ title, description, fields }: FormPreviewProps) {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)
  const sectionGroups = useMemo(() => buildFormSectionGroups(sortedFields), [sortedFields])

  function renderFieldPreview(field: FormField) {
    return (
      <div key={field.id} className="bg-white rounded-lg shadow-sm px-6 py-5 mt-3">
        <label className="block text-sm text-gray-900 mb-1">
          {field.label || '(pergunta não definida)'}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {field.description && (
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">{field.description}</p>
        )}

        {/* Rendered disabled input by type */}
        {field.type === 'short-text' && (
          <input
            type="text"
            disabled
            placeholder={field.placeholder || 'Sua resposta'}
            className="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
        )}

        {field.type === 'long-text' && (
          <textarea
            disabled
            placeholder={field.placeholder || 'Sua resposta'}
            rows={2}
            className="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-400 cursor-not-allowed resize-none"
          />
        )}

        {field.type === 'single-choice' && (
          <div className="space-y-1">
            {field.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 px-3 py-2.5 cursor-not-allowed">
                <span className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 shrink-0" />
                <span className="text-sm text-gray-500">{opt.label || 'Opção'}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'multiple-choice' && (
          <div className="space-y-1">
            {field.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-3 px-3 py-2.5 cursor-not-allowed">
                <span className="w-[18px] h-[18px] rounded border-2 border-gray-300 shrink-0" />
                <span className="text-sm text-gray-500">{opt.label || 'Opção'}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'scale' && (
          <div className="flex items-center gap-3">
            {field.scaleMinLabel && (
              <span className="text-xs text-gray-400 shrink-0">{field.scaleMinLabel}</span>
            )}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: field.scaleMax - field.scaleMin + 1 }, (_, i) => field.scaleMin + i).map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled
                  className="w-10 h-10 rounded-full text-sm text-gray-400 cursor-not-allowed"
                >
                  {val}
                </button>
              ))}
            </div>
            {field.scaleMaxLabel && (
              <span className="text-xs text-gray-400 shrink-0">{field.scaleMaxLabel}</span>
            )}
          </div>
        )}

        {field.type === 'yes-no' && (
          <div className="flex gap-3">
            <button type="button" disabled className="px-5 py-2 rounded-full bg-gray-100 text-sm text-gray-400 cursor-not-allowed">
              Sim
            </button>
            <button type="button" disabled className="px-5 py-2 rounded-full bg-gray-100 text-sm text-gray-400 cursor-not-allowed">
              Não
            </button>
          </div>
        )}

        {field.type === 'date' && (
          <input
            type="date"
            disabled
            className="border-0 border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-[860px] mx-auto space-y-3 py-2">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="h-2 bg-brand-500" />
        <div className="px-6 py-5">
          <h1 className="text-2xl font-normal text-gray-900">
            {title || 'Formulário sem título'}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Fields grouped by section */}
      {sectionGroups.map((group) => (
        <div key={group.sectionFieldId}>
          {/* Section header */}
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

          {/* Fields */}
          {group.children.map((field) => renderFieldPreview(field))}
        </div>
      ))}

      {sortedFields.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-sm text-gray-400">
            Nenhuma pergunta adicionada ainda
          </p>
        </div>
      )}
    </div>
  )
}
