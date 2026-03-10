import { useState, useEffect } from 'react'
import type {
  Block,
  BlockData,
  BlockType,
  IdentificationData,
  TextBlockData,
  ScoreTableData,
  InfoBoxData,
  ChartData,
  ReferencesData,
  ClosingPageData,
  Customer,
} from '@/types'
import { BLOCK_TYPE_LABELS } from '@/types'
import { BLOCK_TYPE_COLORS, getBlockTypeIcon } from '@/lib/block-constants'
import Modal from '@/components/ui/Modal'
import IdentificationBlock from '@/components/blocks/IdentificationBlock'
import TextBlockModal from '@/components/blocks/TextBlockModal'
import ScoreTableBlock from '@/components/blocks/ScoreTableBlock'
import InfoBoxBlock from '@/components/blocks/InfoBoxBlock'
import ChartBlock from '@/components/blocks/ChartBlock'
import ReferencesBlock from '@/components/blocks/ReferencesBlock'
import ClosingPageBlock from '@/components/blocks/ClosingPageBlock'

interface BlockEditModalProps {
  block: Block | null
  onClose: () => void
  onChange: (blockId: string, data: BlockData) => void
  customers?: Customer[]
  onCustomerSelected?: (customerId: string) => void
}

const MODAL_SIZES: Record<BlockType, 'sm' | 'md' | 'lg' | 'xl' | '2xl'> = {
  identification: '2xl',
  text: 'xl',
  'score-table': 'xl',
  'info-box': 'lg',
  chart: '2xl',
  references: 'xl',
  'closing-page': 'lg',
}

function getModalTitle(block: Block): string {
  const typeLabel = BLOCK_TYPE_LABELS[block.type]

  switch (block.type) {
    case 'text': {
      const d = block.data as TextBlockData
      const name = d.title || d.subtitle || ''
      return name ? `${typeLabel} — ${name}` : typeLabel
    }
    case 'score-table': {
      const d = block.data as ScoreTableData
      return d.title ? `${typeLabel} — ${d.title}` : typeLabel
    }
    case 'chart': {
      const d = block.data as ChartData
      return d.title ? `${typeLabel} — ${d.title}` : typeLabel
    }
    case 'info-box': {
      const d = block.data as InfoBoxData
      return d.label ? `${typeLabel} — ${d.label}` : typeLabel
    }
    case 'references': {
      const d = block.data as ReferencesData
      return d.title || typeLabel
    }
    case 'closing-page': {
      const d = block.data as ClosingPageData
      return d.title || typeLabel
    }
    default:
      return typeLabel
  }
}

export default function BlockEditModal({ block, onClose, onChange, customers, onCustomerSelected }: BlockEditModalProps) {
  const [localData, setLocalData] = useState<BlockData | null>(null)

  useEffect(() => {
    if (block) {
      setLocalData(structuredClone(block.data))
    } else {
      setLocalData(null)
    }
  }, [block])

  if (!block || !localData) return null

  const handleLocalChange = (data: BlockData) => {
    setLocalData(data)
  }

  const handleSave = () => {
    onChange(block.id, localData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const renderContent = () => {
    switch (block.type) {
      case 'identification':
        return (
          <IdentificationBlock
            data={localData as IdentificationData}
            onChange={handleLocalChange}
            customers={customers}
            onCustomerSelected={onCustomerSelected}
          />
        )
      case 'text':
        return (
          <TextBlockModal
            data={localData as TextBlockData}
            onChange={handleLocalChange}
          />
        )
      case 'score-table':
        return (
          <ScoreTableBlock
            data={localData as ScoreTableData}
            onChange={handleLocalChange}
          />
        )
      case 'info-box':
        return (
          <InfoBoxBlock
            data={localData as InfoBoxData}
            onChange={handleLocalChange}
          />
        )
      case 'chart':
        return (
          <ChartBlock
            data={localData as ChartData}
            onChange={handleLocalChange}
          />
        )
      case 'references':
        return (
          <ReferencesBlock
            data={localData as ReferencesData}
            onChange={handleLocalChange}
          />
        )
      case 'closing-page':
        return (
          <ClosingPageBlock
            data={localData as ClosingPageData}
            onChange={handleLocalChange}
          />
        )
    }
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={handleCancel}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={handleSave}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Salvar
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={true}
      onClose={handleCancel}
      title={getModalTitle(block)}
      size={MODAL_SIZES[block.type]}
      accent={{
        colorClass: BLOCK_TYPE_COLORS[block.type],
        icon: getBlockTypeIcon(block.type, 18),
      }}
      footer={footer}
    >
      {renderContent()}
    </Modal>
  )
}
