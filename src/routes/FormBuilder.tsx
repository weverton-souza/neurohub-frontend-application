import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type {
  AnamnesisForm,
  FormField,
  FormFieldType,
  FormSectionGroup,
} from '@/types'
import { createEmptyFormField } from '@/types'
import { getFormById, updateForm } from '@/lib/form-service'
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { getAllTemplates } from '@/lib/default-templates'
import { getCustomTemplates } from '@/lib/storage'
import { buildFormSectionGroups } from '@/lib/utils'
import Button from '@/components/ui/Button'
import QuestionCard from '@/components/form-builder/QuestionCard'
import FloatingToolbar from '@/components/form-builder/FloatingToolbar'
import TemplateLinkModal from '@/components/form-builder/TemplateLinkModal'
import FieldMappingEditor from '@/components/form-builder/FieldMappingEditor'
import FormPreview from '@/components/form-builder/FormPreview'
import SectionDeleteModal from '@/components/ui/SectionDeleteModal'
import SectionReorderModal from '@/components/form-builder/SectionReorderModal'

type ViewMode = 'editor' | 'preview' | 'mapping'

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<AnamnesisForm | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [showTemplateLinkModal, setShowTemplateLinkModal] = useState(false)
  const [showSectionReorderModal, setShowSectionReorderModal] = useState(false)
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)

  const updateFormFn = useCallback((data: AnamnesisForm) => updateForm(data), [])
  const { saveStatus, scheduleSave, forceSave } = useAutoSave<AnamnesisForm>(updateFormFn)
  const templates = useMemo(() => getAllTemplates(getCustomTemplates()), [])

  // Load form
  useEffect(() => {
    if (!id) return
    getFormById(id).then((loaded) => {
      if (loaded) setForm(loaded)
      else navigate('/formularios')
    })
  }, [id, navigate])

  const updateFormState = useCallback((patch: Partial<AnamnesisForm>) => {
    setForm((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  // Force save on navigation
  const handleBack = useCallback(async () => {
    if (form) await forceSave(form)
    navigate('/formularios')
  }, [form, navigate, forceSave])

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !form) return

    const fields = [...form.fields]
    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const [moved] = fields.splice(oldIndex, 1)
    fields.splice(newIndex, 0, moved)

    const reordered = fields.map((f, i) => ({ ...f, order: i }))
    updateFormState({ fields: reordered })
  }, [form, updateFormState])

  // ─── Field CRUD ───────────────────────────────────────

  const addFieldAfterFocused = useCallback((type: FormFieldType) => {
    if (!form) return
    const sorted = [...form.fields].sort((a, b) => a.order - b.order)
    let insertOrder = sorted.length

    if (focusedFieldId) {
      const idx = sorted.findIndex((f) => f.id === focusedFieldId)
      if (idx >= 0) insertOrder = idx + 1
    }

    const field = createEmptyFormField(type, insertOrder)
    if (type === 'section-header') field.label = 'Seção sem título'

    const updated = [...sorted]
    updated.splice(insertOrder, 0, field)
    const reordered = updated.map((f, i) => ({ ...f, order: i }))

    updateFormState({ fields: reordered })
    setFocusedFieldId(field.id)
  }, [form, focusedFieldId, updateFormState])

  const handleFieldUpdate = useCallback((updatedField: FormField) => {
    if (!form) return
    const fields = form.fields.map((f) =>
      f.id === updatedField.id ? updatedField : f
    )
    updateFormState({ fields })
  }, [form, updateFormState])

  const handleDuplicateField = useCallback((fieldId: string) => {
    if (!form) return
    const sorted = [...form.fields].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((f) => f.id === fieldId)
    if (idx < 0) return
    const original = sorted[idx]

    const duplicate: FormField = {
      ...original,
      id: crypto.randomUUID(),
      order: 0,
      options: original.options.map((o) => ({ ...o, id: crypto.randomUUID() })),
    }

    const updated = [...sorted]
    updated.splice(idx + 1, 0, duplicate)
    const reordered = updated.map((f, i) => ({ ...f, order: i }))

    updateFormState({ fields: reordered })
    setFocusedFieldId(duplicate.id)
  }, [form, updateFormState])

  const handleRemoveField = useCallback((fieldId: string) => {
    if (!form) return
    const fields = form.fields
      .filter((f) => f.id !== fieldId)
      .map((f, i) => ({ ...f, order: i }))
    const fieldMappings = form.fieldMappings.filter((m) => m.fieldId !== fieldId)
    updateFormState({ fields, fieldMappings })
    if (focusedFieldId === fieldId) setFocusedFieldId(null)
  }, [form, updateFormState, focusedFieldId])

  // ─── Section delete with modal ────────────────────────

  const [sectionDeleteTarget, setSectionDeleteTarget] = useState<{
    sectionFieldId: string
    sectionTitle: string
    childFieldIds: string[]
  } | null>(null)

  const sortedFields = useMemo(
    () => form ? [...form.fields].sort((a, b) => a.order - b.order) : [],
    [form]
  )

  const sectionGroups: FormSectionGroup[] = useMemo(
    () => buildFormSectionGroups(sortedFields),
    [sortedFields]
  )

  const handleRemoveFieldOrSection = useCallback((fieldId: string) => {
    if (!form) return
    const field = form.fields.find((f) => f.id === fieldId)
    if (!field) return

    if (field.type === 'section-header') {
      const group = sectionGroups.find((g) => g.sectionFieldId === fieldId && g.sectionField)
      if (group && group.children.length > 0) {
        setSectionDeleteTarget({
          sectionFieldId: fieldId,
          sectionTitle: group.sectionTitle,
          childFieldIds: group.children.map((f) => f.id),
        })
        return
      }
    }
    handleRemoveField(fieldId)
  }, [form, sectionGroups, handleRemoveField])

  const handleDeleteAllSection = useCallback(() => {
    if (!form || !sectionDeleteTarget) return
    const idsToRemove = new Set([sectionDeleteTarget.sectionFieldId, ...sectionDeleteTarget.childFieldIds])
    const fields = form.fields
      .filter((f) => !idsToRemove.has(f.id))
      .map((f, i) => ({ ...f, order: i }))
    const fieldMappings = form.fieldMappings.filter((m) => !idsToRemove.has(m.fieldId))
    updateFormState({ fields, fieldMappings })
    setSectionDeleteTarget(null)
  }, [form, sectionDeleteTarget, updateFormState])

  const handleMoveAndDeleteSection = useCallback((targetSectionId: string) => {
    if (!form || !sectionDeleteTarget) return
    const sorted = [...form.fields].sort((a, b) => a.order - b.order)

    const targetGroup = sectionGroups.find((g) => g.sectionFieldId === targetSectionId)
    if (!targetGroup) return

    const targetFieldIds = [targetGroup.sectionFieldId, ...targetGroup.children.map((f) => f.id)]
    const lastTargetIndex = Math.max(...targetFieldIds.map((id) => sorted.findIndex((f) => f.id === id)))

    const childFieldIds = new Set(sectionDeleteTarget.childFieldIds)
    const childFields = sorted.filter((f) => childFieldIds.has(f.id))
    const remaining = sorted.filter(
      (f) => f.id !== sectionDeleteTarget.sectionFieldId && !childFieldIds.has(f.id)
    )

    const lastTargetField = sorted[lastTargetIndex]
    const insertIndex = remaining.findIndex((f) => f.id === lastTargetField.id) + 1
    remaining.splice(insertIndex, 0, ...childFields)

    const reordered = remaining.map((f, i) => ({ ...f, order: i }))
    const fieldMappings = form.fieldMappings.filter((m) => m.fieldId !== sectionDeleteTarget.sectionFieldId)
    updateFormState({ fields: reordered, fieldMappings })
    setSectionDeleteTarget(null)
  }, [form, sectionDeleteTarget, sectionGroups, updateFormState])

  const deleteTargetSections = useMemo(() => {
    if (!sectionDeleteTarget) return []
    return sectionGroups
      .filter((g) => g.sectionField && g.sectionFieldId !== sectionDeleteTarget.sectionFieldId)
      .map((g) => ({ value: g.sectionFieldId, label: g.sectionTitle }))
  }, [sectionGroups, sectionDeleteTarget])

  // ─── Section reorder ─────────────────────────────────

  const sectionReorderItems = useMemo(() => {
    return sectionGroups
      .filter((g) => g.sectionField)
      .map((g) => ({
        id: g.sectionFieldId,
        title: g.sectionTitle,
        childCount: g.children.length,
      }))
  }, [sectionGroups])

  const handleReorderSections = useCallback((orderedSectionIds: string[]) => {
    if (!form) return

    // Build a map: sectionId -> [sectionField, ...children]
    const groupMap = new Map<string, FormField[]>()
    const orphans: FormField[] = [] // fields before any section
    for (const group of sectionGroups) {
      if (group.sectionField) {
        groupMap.set(group.sectionFieldId, [group.sectionField, ...group.children])
      } else {
        orphans.push(...group.children)
      }
    }

    // Rebuild in new order: orphans first, then sections in new order
    const reordered: FormField[] = [...orphans]
    for (const sectionId of orderedSectionIds) {
      const groupFields = groupMap.get(sectionId)
      if (groupFields) reordered.push(...groupFields)
    }

    // Also add any sections not in the reorder list (shouldn't happen but safety)
    for (const [id, fields] of groupMap) {
      if (!orderedSectionIds.includes(id)) reordered.push(...fields)
    }

    const numbered = reordered.map((f, i) => ({ ...f, order: i }))
    updateFormState({ fields: numbered })
  }, [form, sectionGroups, updateFormState])

  // "Mesclar com seção acima" — remove section header, children join previous section
  const handleMergeUp = useCallback((sectionFieldId: string) => {
    if (!form) return
    const fields = form.fields
      .filter((f) => f.id !== sectionFieldId)
      .map((f, i) => ({ ...f, order: i }))
    const fieldMappings = form.fieldMappings.filter((m) => m.fieldId !== sectionFieldId)
    updateFormState({ fields, fieldMappings })
  }, [form, updateFormState])

  // ─── Derived ──────────────────────────────────────────

  const linkedTemplate = useMemo(
    () => form?.linkedTemplateId ? templates.find((t) => t.id === form.linkedTemplateId) ?? null : null,
    [form, templates]
  )

  const fieldIds = useMemo(() => sortedFields.map((f) => f.id), [sortedFields])

  // Section numbering for section-header cards
  const sectionNumbers = useMemo(() => {
    const sectionFields = sortedFields.filter((f) => f.type === 'section-header')
    const map = new Map<string, { index: number; total: number }>()
    sectionFields.forEach((f, i) => {
      map.set(f.id, { index: i + 1, total: sectionFields.length })
    })
    return map
  }, [sortedFields])

  // Template link
  const handleTemplateSelect = useCallback((templateId: string | null) => {
    updateFormState({ linkedTemplateId: templateId })
  }, [updateFormState])

  // Click outside cards to unfocus
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Only unfocus if clicking the container itself, not a card
    if (e.target === e.currentTarget) {
      setFocusedFieldId(null)
    }
  }, [])

  if (!form) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      {/* Tabs header (Google Forms style) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[860px] mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Save status */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                saveStatus === 'saved' ? 'bg-green-400' :
                saveStatus === 'saving' ? 'bg-yellow-400' :
                'bg-gray-300'
              }`} />
              <span className="text-xs text-gray-400">
                {saveStatus === 'saved' ? 'Salvo' : saveStatus === 'saving' ? 'Salvando...' : ''}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex">
            {([
              { mode: 'editor' as ViewMode, label: 'Perguntas' },
              { mode: 'preview' as ViewMode, label: 'Preview' },
              { mode: 'mapping' as ViewMode, label: 'Mapeamento' },
            ]).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-4 py-3 text-sm font-medium border-b-[3px] transition-colors ${
                  viewMode === mode
                    ? 'text-brand-600 border-brand-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Template link */}
          <Button
            variant={form.linkedTemplateId ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowTemplateLinkModal(true)}
          >
            {form.linkedTemplateId ? linkedTemplate?.name ?? 'Template' : 'Vincular Template'}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main
        className="min-h-[calc(100vh-49px)] bg-gray-100 py-6"
        onClick={handleContainerClick}
      >
        {/* Editor mode */}
        {viewMode === 'editor' && (
          <div className="max-w-[860px] mx-auto px-4 relative">
            {/* Title card (always visible, always editable) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-3">
              <div className="h-2.5 bg-brand-500 rounded-t-lg" />
              <div className="px-6 py-5">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateFormState({ title: e.target.value })}
                  placeholder="Formulário sem título"
                  className="w-full text-2xl font-normal text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
                />
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => updateFormState({ description: e.target.value })}
                  placeholder="Descrição do formulário"
                  className="w-full text-sm text-gray-600 bg-transparent border-none outline-none mt-2 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Question cards with DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sortedFields.map((field) => {
                    const sn = sectionNumbers.get(field.id)
                    const isFocused = focusedFieldId === field.id

                    return (
                      <div key={field.id} className="relative">
                        <QuestionCard
                          field={field}
                          isFocused={isFocused}
                          onFocus={() => setFocusedFieldId(field.id)}
                          onUpdate={handleFieldUpdate}
                          onDuplicate={() => handleDuplicateField(field.id)}
                          onRemove={() => handleRemoveFieldOrSection(field.id)}
                          onReorderSections={() => setShowSectionReorderModal(true)}
                          onMergeUp={() => handleMergeUp(field.id)}
                          sectionIndex={sn?.index}
                          totalSections={sn?.total}
                        />

                        {/* Floating toolbar - positioned to the right of the focused card */}
                        {isFocused && (
                          <div className="absolute -right-14 top-1/2 -translate-y-1/2 hidden lg:block">
                            <FloatingToolbar
                              onAddQuestion={() => addFieldAfterFocused('single-choice')}
                              onAddSection={() => addFieldAfterFocused('section-header')}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Empty state */}
            {sortedFields.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-400 text-sm mb-4">
                  Nenhuma pergunta adicionada ainda
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => addFieldAfterFocused('single-choice')}
                    className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
                  >
                    Adicionar pergunta
                  </button>
                  <button
                    type="button"
                    onClick={() => addFieldAfterFocused('section-header')}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Adicionar seção
                  </button>
                </div>
              </div>
            )}

            {/* Mobile floating action buttons (visible on smaller screens) */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 lg:hidden z-20">
              <button
                type="button"
                onClick={() => addFieldAfterFocused('section-header')}
                className="w-12 h-12 rounded-full bg-white border border-gray-300 shadow-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                title="Adicionar seção"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => addFieldAfterFocused('single-choice')}
                className="w-14 h-14 rounded-full bg-brand-500 shadow-lg flex items-center justify-center text-white hover:bg-brand-600 transition-colors"
                title="Adicionar pergunta"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Preview mode */}
        {viewMode === 'preview' && (
          <div className="max-w-[860px] mx-auto px-4">
            <FormPreview
              title={form.title}
              description={form.description}
              fields={sortedFields}
            />
          </div>
        )}

        {/* Mapping mode */}
        {viewMode === 'mapping' && (
          <div className="max-w-[860px] mx-auto px-4">
            <FieldMappingEditor
              fields={sortedFields}
              mappings={form.fieldMappings}
              template={linkedTemplate}
              onChange={(mappings) => updateFormState({ fieldMappings: mappings })}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <TemplateLinkModal
        isOpen={showTemplateLinkModal}
        onClose={() => setShowTemplateLinkModal(false)}
        templates={templates}
        currentTemplateId={form.linkedTemplateId}
        onSelect={handleTemplateSelect}
      />

      <SectionDeleteModal
        isOpen={!!sectionDeleteTarget}
        onClose={() => setSectionDeleteTarget(null)}
        sectionTitle={sectionDeleteTarget?.sectionTitle ?? ''}
        childCount={sectionDeleteTarget?.childFieldIds.length ?? 0}
        targetSections={deleteTargetSections}
        onDeleteAll={handleDeleteAllSection}
        onMoveAndDelete={handleMoveAndDeleteSection}
      />

      <SectionReorderModal
        isOpen={showSectionReorderModal}
        onClose={() => setShowSectionReorderModal(false)}
        sections={sectionReorderItems}
        onReorder={handleReorderSections}
      />
    </>
  )
}
