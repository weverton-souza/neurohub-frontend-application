import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FormField, FormFieldType } from '@/types'
import { createEmptyFormFieldOption } from '@/types'
import { sanitizeVariableKey } from '@/lib/variable-service'

// ─── Props ────────────────────────────────────────────────────

interface QuestionCardProps {
  field: FormField
  isFocused: boolean
  onFocus: () => void
  onUpdate: (field: FormField) => void
  onDuplicate: () => void
  onRemove: () => void
  onReorderSections?: () => void
  onMergeUp?: () => void
  sectionIndex?: number
  totalSections?: number
}

// ─── Type options for dropdown ────────────────────────────────

const questionTypes: { type: FormFieldType; label: string }[] = [
  { type: 'short-text', label: 'Resposta curta' },
  { type: 'long-text', label: 'Parágrafo' },
  { type: 'single-choice', label: 'Múltipla escolha' },
  { type: 'multiple-choice', label: 'Caixas de seleção' },
  { type: 'scale', label: 'Escala linear' },
  { type: 'yes-no', label: 'Sim/Não' },
  { type: 'date', label: 'Data' },
]

// ─── Component ────────────────────────────────────────────────

export default function QuestionCard({
  field,
  isFocused,
  onFocus,
  onUpdate,
  onDuplicate,
  onRemove,
  onReorderSections,
  onMergeUp,
  sectionIndex,
  totalSections,
}: QuestionCardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showSectionMenu, setShowSectionMenu] = useState(false)
  const [showVarKey, setShowVarKey] = useState(!!(field.variableKey ?? ''))
  const [showDescription, setShowDescription] = useState(!!field.description)

  const isSectionHeader = field.type === 'section-header'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled: isSectionHeader })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Reset menus when losing focus
  useEffect(() => {
    if (!isFocused) {
      setShowMoreMenu(false)
      setShowSectionMenu(false)
    }
  }, [isFocused])

  // ─── Updaters ───────────────────────────────────────────

  const update = (patch: Partial<FormField>) => {
    onUpdate({ ...field, ...patch })
  }

  const handleTypeChange = (newType: FormFieldType) => {
    const updated: Partial<FormField> = { type: newType }
    if (
      (newType === 'single-choice' || newType === 'multiple-choice') &&
      field.options.length < 2
    ) {
      updated.options = [createEmptyFormFieldOption(), createEmptyFormFieldOption()]
    }
    update(updated)
  }

  const updateOption = (index: number, label: string) => {
    const options = field.options.map((opt, i) =>
      i === index ? { ...opt, label } : opt
    )
    update({ options })
  }

  const addOption = () => {
    update({ options: [...field.options, createEmptyFormFieldOption()] })
  }

  const removeOption = (index: number) => {
    if (field.options.length <= 1) return
    update({ options: field.options.filter((_, i) => i !== index) })
  }

  // ─── Render: Section Header ─────────────────────────────

  if (isSectionHeader) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-field-id={field.id}
        className={`mt-6 ${isFocused ? 'border-l-[6px] border-l-brand-500 rounded-l-lg' : ''}`}
      >
        {/* Section badge */}
        {sectionIndex != null && totalSections != null && (
          <div>
            <span className={`inline-block bg-brand-500 text-white text-sm font-medium px-4 py-1.5 ${isFocused ? 'rounded-tr-lg' : 'rounded-t-lg'}`}>
              Seção {sectionIndex} de {totalSections}
            </span>
          </div>
        )}

        <div
          className={`bg-white shadow-sm cursor-pointer transition-all ${
            isFocused
              ? 'rounded-br-lg border-y border-r border-gray-200'
              : 'overflow-hidden rounded-b-lg rounded-tr-lg border border-gray-200'
          }`}
          onClick={onFocus}
        >

          <div className="px-6 py-4">
            {isFocused ? (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => update({ label: e.target.value })}
                    placeholder="Título da seção"
                    className="w-full text-base font-normal text-gray-900 bg-gray-50 border-b border-gray-300 px-2 py-2 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
                  />
                  <input
                    type="text"
                    value={field.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Descrição (opcional)"
                    className="w-full text-sm text-gray-600 bg-transparent border-b border-gray-200 px-2 py-2 mt-2 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                {/* Section actions: collapse + three-dots */}
                <div className="flex items-center gap-0.5 shrink-0 pt-1">
                  {/* Three-dots menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowSectionMenu(!showSectionMenu) }}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                      title="Opções da seção"
                    >
                      <ThreeDotsIcon />
                    </button>

                    {showSectionMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSectionMenu(false)} />
                        <div className="absolute right-0 top-10 z-20 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowSectionMenu(false) }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Duplicar seção
                          </button>
                          {onMergeUp && sectionIndex != null && sectionIndex > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onMergeUp(); setShowSectionMenu(false) }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Mesclar com a seção acima
                            </button>
                          )}
                          {onReorderSections && totalSections != null && totalSections > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onReorderSections(); setShowSectionMenu(false) }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Reorganizar seções
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemove(); setShowSectionMenu(false) }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Excluir seção
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-base font-normal text-gray-900">
                  {field.label || 'Seção sem título'}
                </h2>
                {field.description && (
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Question (unfocused) ───────────────────────

  if (!isFocused) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-field-id={field.id}
        className="bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-gray-300 transition-all"
        onClick={onFocus}
      >
        <div className="px-6 py-5">
          {/* Question label */}
          <p className="text-sm text-gray-900">
            {field.label || 'Pergunta'}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </p>

          {/* Compact preview by type */}
          <div className="mt-3">
            {renderCompactPreview(field)}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Question (focused) ─────────────────────────

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-field-id={field.id}
      className="bg-white rounded-r-lg rounded-l-none border-y border-r border-gray-200 border-l-[6px] border-l-brand-500 shadow-md transition-all"
      onClick={onFocus}
    >
      {/* Drag handle centered */}
      <div className="flex justify-center pt-1 pb-0">
        <button
          type="button"
          className="p-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400"
          {...attributes}
          {...listeners}
        >
          <DragDotsIcon />
        </button>
      </div>

      <div className="px-6 pb-5">
        {/* Question input + Type dropdown */}
        <div className="flex items-start gap-4 mb-4">
          <input
            type="text"
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Pergunta"
            className="flex-1 text-base text-gray-900 bg-gray-50 border-b border-gray-300 px-2 py-2 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
          />

          <select
            value={field.type}
            onChange={(e) => handleTypeChange(e.target.value as FormFieldType)}
            className="shrink-0 text-sm bg-white border border-gray-300 rounded px-3 py-2 text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none cursor-pointer"
          >
            {questionTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type-specific content */}
        {renderFocusedContent(field, {
          updateOption,
          addOption,
          removeOption,
          update,
        })}

        {/* Description (toggleable) */}
        {showDescription && (
          <div className="mt-4">
            <input
              type="text"
              value={field.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Descrição (opcional)"
              className="w-full text-sm text-gray-600 bg-transparent border-b border-gray-200 px-2 py-1.5 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
            />
          </div>
        )}

        {/* Variable key (toggleable) */}
        {showVarKey && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">Variável:</span>
            <input
              type="text"
              value={field.variableKey ?? ''}
              onChange={(e) => update({ variableKey: sanitizeVariableKey(e.target.value) })}
              placeholder="ex: queixa_principal"
              className="flex-1 text-xs font-mono text-brand-600 bg-brand-50/50 border border-brand-200 rounded px-2 py-1 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
            />
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-gray-200 mt-5 pt-3">
          <div className="flex items-center justify-end gap-1">
            {/* Copy */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate() }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Duplicar"
            >
              <CopyIcon />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Excluir"
            >
              <TrashIcon />
            </button>

            {/* Vertical separator */}
            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Required toggle */}
            <span className="text-sm text-gray-600 mr-1">Obrigatória</span>
            <button
              type="button"
              role="switch"
              aria-checked={field.required}
              onClick={(e) => { e.stopPropagation(); update({ required: !field.required }) }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                field.required ? 'bg-brand-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  field.required ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>

            {/* Three-dots menu */}
            <div className="relative ml-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu) }}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                title="Mais opções"
              >
                <ThreeDotsIcon />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 bottom-10 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button
                      type="button"
                      onClick={() => { setShowDescription(!showDescription); setShowMoreMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      {showDescription ? <CheckIcon /> : <span className="w-4" />}
                      Descrição
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowVarKey(!showVarKey); setShowMoreMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      {showVarKey ? <CheckIcon /> : <span className="w-4" />}
                      Chave de variável
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Compact preview (unfocused) ──────────────────────────

function renderCompactPreview(field: FormField) {
  switch (field.type) {
    case 'short-text':
      return (
        <div className="border-b border-gray-200 pb-1 w-1/2">
          <span className="text-xs text-gray-400">Texto de resposta curta</span>
        </div>
      )

    case 'long-text':
      return (
        <div className="border-b border-gray-200 pb-1">
          <span className="text-xs text-gray-400">Texto de resposta longa</span>
        </div>
      )

    case 'single-choice':
      return (
        <div className="space-y-1.5">
          {field.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              <span className="text-sm text-gray-600">{opt.label || `Opção ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )

    case 'multiple-choice':
      return (
        <div className="space-y-1.5">
          {field.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
              <span className="text-sm text-gray-600">{opt.label || `Opção ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )

    case 'scale': {
      const values = Array.from(
        { length: field.scaleMax - field.scaleMin + 1 },
        (_, i) => field.scaleMin + i
      )
      return (
        <div className="flex items-center gap-2.5">
          {field.scaleMinLabel && (
            <span className="text-xs text-gray-400 shrink-0">{field.scaleMinLabel}</span>
          )}
          <div className="flex items-center gap-2">
            {values.map((v) => (
              <span key={v} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                {v}
              </span>
            ))}
          </div>
          {field.scaleMaxLabel && (
            <span className="text-xs text-gray-400 shrink-0">{field.scaleMaxLabel}</span>
          )}
        </div>
      )
    }

    case 'yes-no':
      return (
        <div className="flex gap-3">
          <span className="px-4 py-1.5 rounded-full bg-gray-100 text-sm text-gray-500">Sim</span>
          <span className="px-4 py-1.5 rounded-full bg-gray-100 text-sm text-gray-500">Não</span>
        </div>
      )

    case 'date':
      return (
        <div className="border-b border-gray-200 pb-1 w-40">
          <span className="text-xs text-gray-400">dd/mm/aaaa</span>
        </div>
      )

    default:
      return null
  }
}

// ─── Focused content (editable) ───────────────────────────

interface ContentHelpers {
  updateOption: (index: number, label: string) => void
  addOption: () => void
  removeOption: (index: number) => void
  update: (patch: Partial<FormField>) => void
}

function renderFocusedContent(field: FormField, h: ContentHelpers) {
  switch (field.type) {
    case 'short-text':
      return (
        <div className="border-b border-dotted border-gray-200 pb-1 w-1/2">
          <span className="text-sm text-gray-400">Texto de resposta curta</span>
        </div>
      )

    case 'long-text':
      return (
        <div className="border-b border-dotted border-gray-200 pb-1">
          <span className="text-sm text-gray-400">Texto de resposta longa</span>
        </div>
      )

    case 'single-choice':
      return <ChoiceEditor field={field} marker="radio" helpers={h} />

    case 'multiple-choice':
      return <ChoiceEditor field={field} marker="checkbox" helpers={h} />

    case 'scale':
      return <ScaleEditor field={field} update={h.update} />

    case 'yes-no':
      return (
        <div className="flex gap-3">
          <span className="px-5 py-2 rounded-full bg-gray-100 text-sm text-gray-500">Sim</span>
          <span className="px-5 py-2 rounded-full bg-gray-100 text-sm text-gray-500">Não</span>
        </div>
      )

    case 'date':
      return (
        <div className="flex items-center gap-2 border-b border-dotted border-gray-200 pb-1 w-48">
          <CalendarIcon />
          <span className="text-sm text-gray-400">Dia, Mês, Ano</span>
        </div>
      )

    default:
      return null
  }
}

// ─── Choice editor (radio / checkbox) ─────────────────────

function ChoiceEditor({
  field,
  marker,
  helpers,
}: {
  field: FormField
  marker: 'radio' | 'checkbox'
  helpers: ContentHelpers
}) {
  return (
    <div className="space-y-2">
      {field.options.map((opt, index) => (
        <div key={opt.id} className="flex items-center gap-2.5 group/opt">
          {marker === 'radio' ? (
            <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
          ) : (
            <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
          )}
          <input
            type="text"
            value={opt.label}
            onChange={(e) => helpers.updateOption(index, e.target.value)}
            placeholder={`Opção ${index + 1}`}
            className="flex-1 text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gray-300 px-1 py-1 focus:outline-none placeholder:text-gray-400 transition-colors"
          />
          {field.options.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); helpers.removeOption(index) }}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-300 opacity-0 group-hover/opt:opacity-100 transition-opacity"
              title="Remover opção"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      ))}

      {/* Add option row */}
      <div className="flex items-center gap-2.5">
        {marker === 'radio' ? (
          <span className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
        ) : (
          <span className="w-4 h-4 rounded border-2 border-gray-200 shrink-0" />
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); helpers.addOption() }}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-1 py-1"
        >
          Adicionar opção
        </button>
      </div>
    </div>
  )
}

// ─── Scale editor ─────────────────────────────────────────

function ScaleEditor({
  field,
  update,
}: {
  field: FormField
  update: (patch: Partial<FormField>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <select
            value={field.scaleMin}
            onChange={(e) => update({ scaleMin: Number(e.target.value) })}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-brand-500 focus:outline-none"
          >
            {[0, 1].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400">até</span>
          <select
            value={field.scaleMax}
            onChange={(e) => update({ scaleMax: Number(e.target.value) })}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-brand-500 focus:outline-none"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">{field.scaleMin}</span>
          <input
            type="text"
            value={field.scaleMinLabel}
            onChange={(e) => update({ scaleMinLabel: e.target.value })}
            placeholder="Rótulo (opcional)"
            className="flex-1 text-sm text-gray-700 border-b border-gray-200 px-1 py-1 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">{field.scaleMax}</span>
          <input
            type="text"
            value={field.scaleMaxLabel}
            onChange={(e) => update({ scaleMaxLabel: e.target.value })}
            placeholder="Rótulo (opcional)"
            className="flex-1 text-sm text-gray-700 border-b border-gray-200 px-1 py-1 focus:border-brand-500 focus:outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────

function DragDotsIcon() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="currentColor">
      <circle cx="4" cy="2" r="1.2" />
      <circle cx="10" cy="2" r="1.2" />
      <circle cx="16" cy="2" r="1.2" />
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="10" cy="8" r="1.2" />
      <circle cx="16" cy="8" r="1.2" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function ThreeDotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
