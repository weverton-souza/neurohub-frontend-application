import { useMemo } from 'react'
import type { FormField, FormFieldMapping, LaudoTemplate } from '@/types'
import { FORM_FIELD_TYPE_LABELS } from '@/types'
import { getBlockTitle } from '@/lib/block-constants'
import { buildFormSectionGroups } from '@/lib/utils'

interface FieldMappingEditorProps {
  fields: FormField[]
  mappings: FormFieldMapping[]
  template: LaudoTemplate | null
  onChange: (mappings: FormFieldMapping[]) => void
}

function getTemplateSections(template: LaudoTemplate): string[] {
  const sections: string[] = []
  for (const block of template.blocks) {
    const title = getBlockTitle(block)
    if (title && !sections.includes(title)) {
      sections.push(title)
    }
  }
  return sections
}

export default function FieldMappingEditor({ fields, mappings, template, onChange }: FieldMappingEditorProps) {
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields])
  const sectionGroups = useMemo(() => buildFormSectionGroups(sortedFields), [sortedFields])

  if (!template) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">
          Vincule um template de laudo para configurar o mapeamento dos campos.
        </p>
      </div>
    )
  }

  const sections = getTemplateSections(template)

  // Check if any question fields exist
  const hasQuestions = fields.some(f => f.type !== 'section-header')

  const getMappingForField = (fieldId: string): FormFieldMapping | undefined => {
    return mappings.find(m => m.fieldId === fieldId)
  }

  const updateMapping = (fieldId: string, patch: Partial<FormFieldMapping>) => {
    const existing = mappings.find(m => m.fieldId === fieldId)
    if (existing) {
      onChange(mappings.map(m =>
        m.fieldId === fieldId ? { ...m, ...patch } : m
      ))
    } else {
      onChange([...mappings, {
        fieldId,
        targetSection: patch.targetSection ?? '',
        hint: patch.hint ?? '',
      }])
    }
  }

  if (!hasQuestions) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">
          Adicione perguntas ao formulário para configurar o mapeamento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Mapeie cada pergunta para a seção do laudo onde a IA deve inserir a resposta.
      </p>

      <div className="space-y-4">
        {sectionGroups.map((group) => (
          <div key={group.sectionFieldId}>
            {/* Section header */}
            {group.sectionField && (
              <div className="flex items-center gap-2 mb-2 mt-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {group.sectionField.label || 'Seção sem título'}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            )}

            {/* Question fields */}
            <div className="space-y-2">
              {group.children.map((field) => {
                const mapping = getMappingForField(field.id)
                const varKey = field.variableKey ?? ''

                return (
                  <div
                    key={field.id}
                    className="bg-gray-50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase text-gray-400 bg-white px-1.5 py-0.5 rounded">
                        {FORM_FIELD_TYPE_LABELS[field.type]}
                      </span>
                      {varKey && (
                        <span className="text-[10px] font-mono text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                          {`{{${varKey}}}`}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {field.label || '(sem pergunta)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Seção do laudo</label>
                        <select
                          value={mapping?.targetSection ?? ''}
                          onChange={(e) => updateMapping(field.id, { targetSection: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        >
                          <option value="">Automático (IA decide)</option>
                          {sections.map((section) => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dica para a IA</label>
                        <input
                          type="text"
                          value={mapping?.hint ?? ''}
                          onChange={(e) => updateMapping(field.id, { hint: e.target.value })}
                          placeholder="Opcional"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
