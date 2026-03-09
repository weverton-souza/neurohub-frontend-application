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
  Patient,
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
  patients?: Patient[]
  onPatientSelected?: (patientId: string) => void
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

export default function BlockEditModal({ block, onClose, onChange, patients, onPatientSelected }: BlockEditModalProps) {
  if (!block) return null

  const handleChange = (data: BlockData) => {
    onChange(block.id, data)
  }

  const renderContent = () => {
    switch (block.type) {
      case 'identification':
        return (
          <IdentificationBlock
            data={block.data as IdentificationData}
            onChange={handleChange}
            patients={patients}
            onPatientSelected={onPatientSelected}
          />
        )
      case 'text':
        return (
          <TextBlockModal
            data={block.data as TextBlockData}
            onChange={handleChange}
          />
        )
      case 'score-table':
        return (
          <ScoreTableBlock
            data={block.data as ScoreTableData}
            onChange={handleChange}
          />
        )
      case 'info-box':
        return (
          <InfoBoxBlock
            data={block.data as InfoBoxData}
            onChange={handleChange}
          />
        )
      case 'chart':
        return (
          <ChartBlock
            data={block.data as ChartData}
            onChange={handleChange}
          />
        )
      case 'references':
        return (
          <ReferencesBlock
            data={block.data as ReferencesData}
            onChange={handleChange}
          />
        )
      case 'closing-page':
        return (
          <ClosingPageBlock
            data={block.data as ClosingPageData}
            onChange={handleChange}
          />
        )
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={getModalTitle(block)}
      size={MODAL_SIZES[block.type]}
      accent={{
        colorClass: BLOCK_TYPE_COLORS[block.type],
        icon: getBlockTypeIcon(block.type, 18),
      }}
    >
      {renderContent()}
    </Modal>
  )
}
