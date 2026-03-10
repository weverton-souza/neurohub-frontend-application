import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Block, BlockType, BlockData, Report, ReportStatus, ReportVersion, TextBlockData, Customer, ScoreTableTemplate, ChartTemplate } from '@/types'
import { createScoreTableFromTemplate, createChartFromTemplate } from '@/types'
import { getReport, updateReport } from '@/lib/api/report-api'
import { getCustomers } from '@/lib/api/customer-api'
import { createReportTemplate, getScoreTableTemplates, getChartTemplates } from '@/lib/api/template-api'
import { getFormById, getFormResponseById } from '@/lib/api/form-api'
import { useError } from '@/contexts/ErrorContext'
import { createBlock, computeBlockMetas } from '@/lib/utils'
import { useVersioning } from '@/hooks/useVersioning'
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import OutlineTree from '@/components/editor/OutlineTree'
import BlockSelector, { BlockVariant } from '@/components/editor/BlockSelector'
import BlockEditModal from '@/components/editor/BlockEditModal'
import VersionHistoryModal from '@/components/editor/VersionHistoryModal'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import StatusSelector from '@/components/editor/StatusSelector'
import { HistoryIcon, SaveIcon } from '@/components/icons'

export default function ReportEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useError()

  const [report, setReport] = useState<Report | null>(null)
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [showSectionSelector, setShowSectionSelector] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [formProvenanceLabel, setFormProvenanceLabel] = useState<string | null>(null)
  const [formProvenanceId, setFormProvenanceId] = useState<string | null>(null)
  const [scoreTableTemplates, setScoreTableTemplates] = useState<ScoreTableTemplate[]>([])
  const [chartTemplatesState, setChartTemplatesState] = useState<ChartTemplate[]>([])
  const sectionSelectorRef = useRef<HTMLDivElement>(null)

  const saveReportFn = useCallback((data: Report) => updateReport(data), [])
  const { saveStatus, scheduleSave, forceSave } = useAutoSave<Report>(saveReportFn)

  // Load report, customers, and templates
  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const [loaded, customersPage, stTemplates, cTemplates] = await Promise.all([
          getReport(id!),
          getCustomers(0, 200),
          getScoreTableTemplates(),
          getChartTemplates(),
        ])
        setReport(loaded)
        setCustomers(customersPage.content)
        setScoreTableTemplates(stTemplates)
        setChartTemplatesState(cTemplates)

        // Load provenance info if report was generated from a form response
        if (loaded.formResponseId && loaded.formId) {
          try {
            const resp = await getFormResponseById(loaded.formId, loaded.formResponseId)
            if (resp) {
              const form = await getFormById(resp.formId)
              setFormProvenanceLabel(form?.title || 'Formulário')
              setFormProvenanceId(resp.formId)
            }
          } catch {
            // provenance info is optional
          }
        }
      } catch {
        navigate('/')
      }
    }
    load()
  }, [id, navigate])

  // Versioning
  const {
    versions,
    refreshVersions,
    createStatusChangeSnapshot,
    createExportSnapshot,
    createManualSnapshot,
    createSnapshot,
  } = useVersioning(report)

  const handleUpdateReport = useCallback(
    (updates: Partial<Report>) => {
      if (!report) return
      const updated = { ...report, ...updates }
      setReport(updated)
      scheduleSave(updated)
    },
    [report, scheduleSave]
  )

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      handleUpdateReport({ blocks })
    },
    [handleUpdateReport]
  )

  const handleBlockDataChange = useCallback(
    (blockId: string, data: BlockData) => {
      if (!report) return
      const updated = report.blocks.map((b) =>
        b.id === blockId ? { ...b, data } : b
      )
      handleUpdateReport({ blocks: updated })
    },
    [report, handleUpdateReport]
  )

  const handleCustomerSelected = useCallback(
    (customerId: string) => {
      handleUpdateReport({ customerId })
    },
    [handleUpdateReport]
  )

  const handleAddBlock = useCallback(
    (type: BlockType, variant?: BlockVariant, templateId?: string) => {
      if (!report) return

      const sorted = [...report.blocks].sort((a, b) => a.order - b.order)
      const newBlock = createBlock(type, 0)

      // Score table com template: preencher dados do template
      if (type === 'score-table' && templateId) {
        const template = scoreTableTemplates.find(t => t.id === templateId)
        if (template) {
          newBlock.data = createScoreTableFromTemplate(template)
        }
      }

      // Chart com template: preencher dados do template
      if (type === 'chart' && templateId) {
        const template = chartTemplatesState.find(t => t.id === templateId)
        if (template) {
          newBlock.data = createChartFromTemplate(template)
        }
      }

      // Subtitle variant: set subtitle field so it's recognized as a subsection
      if (type === 'text' && variant === 'subtitle') {
        ;(newBlock.data as TextBlockData).subtitle = 'Novo Subtítulo'
      }

      let newBlocks: Block[]
      if (insertAfterBlockId) {
        const afterIndex = sorted.findIndex((b) => b.id === insertAfterBlockId)
        if (afterIndex !== -1) {
          sorted.splice(afterIndex + 1, 0, newBlock)
          newBlocks = sorted.map((b, i) => ({ ...b, order: i }))
        } else {
          newBlocks = [...sorted, newBlock].map((b, i) => ({ ...b, order: i }))
        }
      } else {
        newBlocks = [...sorted, newBlock].map((b, i) => ({ ...b, order: i }))
      }

      setInsertAfterBlockId(null)
      handleUpdateReport({ blocks: newBlocks })

      // Abrir edição automaticamente para tabelas e gráficos
      if (type === 'score-table' || type === 'chart') {
        setEditingBlockId(newBlock.id)
      }
    },
    [report, handleUpdateReport, insertAfterBlockId, scoreTableTemplates, chartTemplatesState]
  )

  const handleRequestAddBlock = useCallback(
    (afterBlockId: string) => {
      setInsertAfterBlockId(afterBlockId)
      setShowBlockSelector(true)
    },
    []
  )

  const handleAddTextSection = useCallback(() => {
    if (!report) return

    const sorted = [...report.blocks].sort((a, b) => a.order - b.order)
    const newBlock = createBlock('text', 0)
    ;(newBlock.data as TextBlockData).title = 'Nova Seção'

    // Insert before closing-page so it always stays last
    const closingIdx = sorted.findIndex((b) => b.type === 'closing-page')
    if (closingIdx !== -1) {
      sorted.splice(closingIdx, 0, newBlock)
    } else {
      sorted.push(newBlock)
    }
    const newBlocks = sorted.map((b, i) => ({ ...b, order: i }))
    handleUpdateReport({ blocks: newBlocks })
    setShowSectionSelector(false)
  }, [report, handleUpdateReport])

  const handleAddClosingPage = useCallback(() => {
    if (!report) return

    const sorted = [...report.blocks].sort((a, b) => a.order - b.order)
    const newBlock = createBlock('closing-page', 0)
    const newBlocks = [...sorted, newBlock].map((b, i) => ({ ...b, order: i }))
    handleUpdateReport({ blocks: newBlocks })
    setShowSectionSelector(false)
  }, [report, handleUpdateReport])

  const handleSaveTemplate = useCallback(async () => {
    if (!report || !templateName.trim()) return

    try {
      await createReportTemplate({
        name: templateName.trim(),
        description: templateDesc.trim(),
        isDefault: false,
        blocks: report.blocks.map((b) => ({
          type: b.type,
          order: b.order,
          data: JSON.parse(JSON.stringify(b.data)),
        })),
      })
      setShowSaveTemplate(false)
      setTemplateName('')
      setTemplateDesc('')
    } catch (err) {
      showError(err)
    }
  }, [report, templateName, templateDesc, showError])

  const handleGenerateDocx = useCallback(async () => {
    if (!report) return

    try {
      createExportSnapshot('DOCX')
      const finalized = { ...report, status: 'finalizado' as const }
      setReport(finalized)
      await updateReport(finalized)

      const { generateDocx } = await import('@/lib/docx-generator')
      await generateDocx(finalized)
    } catch (err) {
      showError(err)
    }
  }, [report, createExportSnapshot, showError])

  const handleForceSave = useCallback(() => {
    if (!report) return
    forceSave(report)
  }, [report, forceSave])

  const handleStatusChange = useCallback(
    (newStatus: ReportStatus) => {
      if (report) createStatusChangeSnapshot(report.status)
      handleUpdateReport({ status: newStatus })
    },
    [report, handleUpdateReport, createStatusChangeSnapshot]
  )

  const handleRestoreVersion = useCallback(
    (version: ReportVersion) => {
      createSnapshot('Estado antes de restaurar versão')
      handleUpdateReport({
        customerName: version.customerName,
        blocks: JSON.parse(JSON.stringify(version.blocks)),
      })
    },
    [createSnapshot, handleUpdateReport]
  )

  const handleOpenVersionHistory = useCallback(() => {
    refreshVersions()
    setShowVersionHistory(true)
  }, [refreshVersions])

  // Section collapse/expand
  const toggleSectionCollapse = useCallback((sectionBlockId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionBlockId)) {
        next.delete(sectionBlockId)
      } else {
        next.add(sectionBlockId)
      }
      return next
    })
  }, [])

  // Sorted blocks + metas (memoized)
  const sortedBlocks = useMemo(() => {
    if (!report) return []
    return [...report.blocks].sort((a, b) => a.order - b.order)
  }, [report])

  const blockMetas = useMemo(() => computeBlockMetas(sortedBlocks), [sortedBlocks])

  // Collect all section IDs for collapse/expand all
  const allSectionIds = useMemo(() => {
    const ids: string[] = []
    for (const block of sortedBlocks) {
      const meta = blockMetas[block.id]
      if (meta?.isSection) ids.push(block.id)
    }
    return ids
  }, [sortedBlocks, blockMetas])

  // Default: start with all sections collapsed
  const initialCollapseRef = useRef(false)
  useEffect(() => {
    if (!initialCollapseRef.current && allSectionIds.length > 0) {
      initialCollapseRef.current = true
      setCollapsedSections(new Set(allSectionIds))
    }
  }, [allSectionIds])

  const collapseAll = useCallback(() => {
    setCollapsedSections(new Set(allSectionIds))
  }, [allSectionIds])

  const expandAll = useCallback(() => {
    setCollapsedSections(new Set())
  }, [])

  // Find the block being edited
  const editingBlock = useMemo(() => {
    if (!editingBlockId || !report) return null
    return report.blocks.find((b) => b.id === editingBlockId) ?? null
  }, [editingBlockId, report])

  // Check if closing-page already exists (only allow one)
  const hasClosingPage = useMemo(() => {
    if (!report) return false
    return report.blocks.some((b) => b.type === 'closing-page')
  }, [report])

  // Close section selector on outside click
  const closeSectionSelector = useCallback(() => setShowSectionSelector(false), [])
  useClickOutside(sectionSelectorRef, closeSectionSelector, showSectionSelector)

  if (!report) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh)] bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              handleForceSave()
              navigate('/')
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={report.customerName || ''}
              onChange={(e) => handleUpdateReport({ customerName: e.target.value })}
              placeholder="Nome do cliente"
              className="text-lg font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 w-full truncate placeholder:text-gray-400"
            />
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            {saveStatus === 'saved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-500">Salvo</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-gray-500">Salvando...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-gray-500">Não salvo</span>
              </>
            )}
          </div>

          <StatusSelector status={report.status} onChange={handleStatusChange} />

          <button
            type="button"
            onClick={createManualSnapshot}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Salvar versão"
          >
            <SaveIcon size={18} />
          </button>

          <button
            type="button"
            onClick={handleOpenVersionHistory}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Histórico de versões"
          >
            <HistoryIcon size={18} />
          </button>

          <Button variant="secondary" size="sm" onClick={() => setShowSaveTemplate(true)}>
            Salvar como Template
          </Button>

          <Button variant="primary" size="md" onClick={handleGenerateDocx}>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Gerar .docx
            </span>
          </Button>
        </div>
      </header>

      {/* Form provenance banner */}
      {formProvenanceLabel && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div className="flex items-center gap-2 bg-brand-50 rounded-lg px-3 py-2 text-xs text-brand-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>
              Gerado a partir do formulário{' '}
              <button
                type="button"
                onClick={() => formProvenanceId && navigate(`/formulario/${formProvenanceId}/respostas`)}
                className="font-medium underline hover:text-brand-800"
              >
                {formProvenanceLabel}
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{report.blocks.length} blocos</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={collapseAll}
              className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Recolher todas as seções"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 15.79a.75.75 0 001.06-.02L10 11.832l3.71 3.938a.75.75 0 101.08-1.04l-4.25-4.5a.75.75 0 00-1.08 0l-4.25 4.5a.75.75 0 00.02 1.06z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M5.23 9.79a.75.75 0 001.06-.02L10 5.832l3.71 3.938a.75.75 0 101.08-1.04l-4.25-4.5a.75.75 0 00-1.08 0l-4.25 4.5a.75.75 0 00.02 1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={expandAll}
              className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Expandir todas as seções"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.77 4.21a.75.75 0 01-.02 1.06L10 9.168 6.29 5.23a.75.75 0 00-1.08 1.04l4.25 4.5a.75.75 0 001.08 0l4.25-4.5a.75.75 0 00-.02-1.06z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M14.77 10.21a.75.75 0 01-.02 1.06L10 15.168l-3.71-3.938a.75.75 0 00-1.08 1.04l4.25 4.5a.75.75 0 001.08 0l4.25-4.5a.75.75 0 00-.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Outline Tree */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-6">
        <OutlineTree
          blocks={report.blocks}
          onBlocksChange={handleBlocksChange}
          collapsedSections={collapsedSections}
          onToggleSectionCollapse={toggleSectionCollapse}
          onRequestAddBlock={handleRequestAddBlock}
          onEditBlock={setEditingBlockId}
        />

        <div className="mt-6 flex justify-center">
          <div className="relative w-full max-w-md" ref={sectionSelectorRef}>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowSectionSelector(!showSectionSelector)}
              className="border-2 border-dashed border-gray-300 hover:border-brand-400 hover:text-brand-700 w-full"
            >
              + Adicionar Seção
            </Button>

            {showSectionSelector && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  type="button"
                  onClick={handleAddTextSection}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium">Nova Seção</p>
                    <p className="text-xs text-gray-400">Seção de texto com título</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleAddClosingPage}
                  disabled={hasClosingPage}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${
                    hasClosingPage
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    hasClosingPage ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M9 15l2 2 4-4" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium">Termo de Entrega</p>
                    <p className="text-xs text-gray-400">
                      {hasClosingPage ? 'Já adicionado' : 'Página de encerramento e assinaturas'}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Block Edit Modal */}
      <BlockEditModal
        block={editingBlock}
        onClose={() => setEditingBlockId(null)}
        onChange={handleBlockDataChange}
        customers={customers}
        onCustomerSelected={handleCustomerSelected}
      />

      {/* Block Selector Modal */}
      <BlockSelector
        isOpen={showBlockSelector}
        onClose={() => {
          setShowBlockSelector(false)
          setInsertAfterBlockId(null)
        }}
        onSelect={handleAddBlock}
      />

      {/* Save Template Modal */}
      <Modal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        title="Salvar como Template"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <Input
            label="Nome do template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex: Relatório Infantil"
          />
          <Input
            label="Descrição (opcional)"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            placeholder="Breve descrição do template"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSaveTemplate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versions={versions}
        onRestore={handleRestoreVersion}
      />
    </div>
  )
}
