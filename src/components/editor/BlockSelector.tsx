import React, { useState } from 'react'
import type { BlockType } from '@/types'
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_DESCRIPTIONS, BLOCK_TYPE_COLORS, getBlockTypeIcon } from '@/lib/block-constants'
import Modal from '@/components/ui/Modal'
import ScoreTableTemplatePicker from '@/components/editor/ScoreTableTemplatePicker'
import ChartTemplatePicker from '@/components/editor/ChartTemplatePicker'

export type BlockVariant = 'subtitle'

interface BlockSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: BlockType, variant?: BlockVariant, templateId?: string) => void
}

// Subtitle icon
const SUBTITLE_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="14" y2="15" />
  </svg>
)

interface BlockOption {
  type: BlockType
  variant?: BlockVariant
  label: string
  description: string
  icon: React.ReactNode
  colorClass: string
}

const blockOptions: BlockOption[] = [
  { type: 'text', variant: 'subtitle', label: 'Subtítulo', description: 'Subseção com apenas um título menor', icon: SUBTITLE_ICON, colorClass: 'bg-teal-100 text-teal-600' },
  { type: 'text', label: BLOCK_TYPE_LABELS.text, description: BLOCK_TYPE_DESCRIPTIONS.text, icon: getBlockTypeIcon('text'), colorClass: BLOCK_TYPE_COLORS.text },
  { type: 'score-table', label: BLOCK_TYPE_LABELS['score-table'], description: BLOCK_TYPE_DESCRIPTIONS['score-table'], icon: getBlockTypeIcon('score-table'), colorClass: BLOCK_TYPE_COLORS['score-table'] },
  { type: 'info-box', label: BLOCK_TYPE_LABELS['info-box'], description: BLOCK_TYPE_DESCRIPTIONS['info-box'], icon: getBlockTypeIcon('info-box'), colorClass: BLOCK_TYPE_COLORS['info-box'] },
  { type: 'chart', label: BLOCK_TYPE_LABELS.chart, description: BLOCK_TYPE_DESCRIPTIONS.chart, icon: getBlockTypeIcon('chart'), colorClass: BLOCK_TYPE_COLORS.chart },
  { type: 'references', label: BLOCK_TYPE_LABELS.references, description: BLOCK_TYPE_DESCRIPTIONS.references, icon: getBlockTypeIcon('references'), colorClass: BLOCK_TYPE_COLORS.references },
]

export default function BlockSelector({ isOpen, onClose, onSelect }: BlockSelectorProps) {
  const [showTemplatePicker, setShowTemplatePicker] = useState<'score-table' | 'chart' | null>(null)

  const handleSelect = (option: BlockOption) => {
    if (option.type === 'score-table') {
      setShowTemplatePicker('score-table')
      return
    }
    if (option.type === 'chart') {
      setShowTemplatePicker('chart')
      return
    }
    onSelect(option.type, option.variant)
    handleClose()
  }

  const handleClose = () => {
    setShowTemplatePicker(null)
    onClose()
  }

  const handleSelectScoreTemplate = (templateId: string) => {
    onSelect('score-table', undefined, templateId)
    handleClose()
  }

  const handleSelectEmptyScoreTable = () => {
    onSelect('score-table')
    handleClose()
  }

  const handleSelectChartTemplate = (templateId: string) => {
    onSelect('chart', undefined, templateId)
    handleClose()
  }

  const handleSelectEmptyChart = () => {
    onSelect('chart')
    handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Bloco" size="md">
      {showTemplatePicker === 'score-table' ? (
        <ScoreTableTemplatePicker
          onSelectTemplate={handleSelectScoreTemplate}
          onSelectEmpty={handleSelectEmptyScoreTable}
          onBack={() => setShowTemplatePicker(null)}
        />
      ) : showTemplatePicker === 'chart' ? (
        <ChartTemplatePicker
          onSelectTemplate={handleSelectChartTemplate}
          onSelectEmpty={handleSelectEmptyChart}
          onBack={() => setShowTemplatePicker(null)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {blockOptions.map((option) => (
            <button
              key={`${option.type}-${option.variant ?? 'default'}`}
              type="button"
              onClick={() => handleSelect(option)}
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left group"
            >
              <div className={`p-2 rounded-lg shrink-0 ${option.colorClass}`}>
                {option.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm group-hover:text-brand-700">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
