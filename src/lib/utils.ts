import {
  Block,
  BlockType,
  TextBlockData,
  ScoreTableData,
  ChartData,
  InfoBoxData,
  ReferencesData,
  ClosingPageData,
  Page,
  FormField,
  FormSectionGroup,
  createEmptyIdentificationData,
  createEmptyTextBlockData,
  createEmptyScoreTableData,
  createEmptyInfoBoxData,
  createEmptyChartData,
  createEmptyReferencesData,
  createEmptyClosingPageData,
} from '@/types'
import { getProfessional } from '@/lib/storage'

export function createBlock(type: BlockType, order: number): Block {
  const id = crypto.randomUUID()
  let data

  switch (type) {
    case 'identification':
      data = createEmptyIdentificationData(getProfessional())
      break
    case 'text':
      data = createEmptyTextBlockData()
      break
    case 'score-table':
      data = createEmptyScoreTableData()
      break
    case 'info-box':
      data = createEmptyInfoBoxData()
      break
    case 'chart':
      data = createEmptyChartData()
      break
    case 'references':
      data = createEmptyReferencesData()
      break
    case 'closing-page':
      data = createEmptyClosingPageData()
      break
  }

  return {
    id,
    type,
    order,
    data,
    collapsed: false,
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/**
 * Computes contextual labels and section grouping for a sorted list of blocks.
 * Returns a map of blockId -> BlockMeta where:
 *  - label: the contextual label (e.g. "Anamnese > Dados Pessoais")
 *  - section: the parent section title (from the most recent text block with title)
 *  - sectionBlockId: the block ID that defines the current section
 *  - isSection: whether this block defines a new section
 */
export interface BlockMeta {
  label: string
  sectionTitle: string
  section: string
  sectionBlockId: string
  isSection: boolean
}

export function computeBlockMetas(sortedBlocks: Block[]): Record<string, BlockMeta> {
  let lastTitle = ''
  let lastSectionBlockId = ''
  const result: Record<string, BlockMeta> = {}

  for (const block of sortedBlocks) {
    let label = ''
    let sectionTitle = ''
    let isSection = false

    switch (block.type) {
      case 'identification': {
        label = 'Identificação'
        sectionTitle = 'Identificação'
        isSection = true
        lastSectionBlockId = block.id
        break
      }
      case 'text': {
        const d = block.data as TextBlockData
        if (d.title && d.subtitle) {
          label = `${d.title} > ${d.subtitle}`
          sectionTitle = d.title
          lastTitle = d.title
          lastSectionBlockId = block.id
          isSection = true
        } else if (d.title) {
          label = d.title
          sectionTitle = d.title
          lastTitle = d.title
          lastSectionBlockId = block.id
          isSection = true
        } else if (d.subtitle) {
          label = lastTitle ? `${lastTitle} > ${d.subtitle}` : d.subtitle
        }
        break
      }
      case 'score-table': {
        const d = block.data as ScoreTableData
        if (d.title) {
          label = lastTitle ? `${lastTitle} > ${d.title}` : d.title
        } else if (lastTitle) {
          label = lastTitle
        }
        break
      }
      case 'chart': {
        const d = block.data as ChartData
        if (d.title) {
          label = lastTitle ? `${lastTitle} > ${d.title}` : d.title
        } else if (lastTitle) {
          label = lastTitle
        }
        break
      }
      case 'info-box': {
        const d = block.data as InfoBoxData
        const boxLabel = d.label || ''
        if (boxLabel) {
          label = lastTitle ? `${lastTitle} > ${boxLabel}` : boxLabel
        } else if (lastTitle) {
          label = lastTitle
        }
        break
      }
      case 'references': {
        const d = block.data as ReferencesData
        const refTitle = d.title || 'Referências'
        label = lastTitle ? `${lastTitle} > ${refTitle}` : refTitle
        break
      }
      case 'closing-page': {
        const d = block.data as ClosingPageData
        label = d.title || 'Termo de Entrega'
        sectionTitle = d.title || 'Termo de Entrega'
        isSection = true
        lastSectionBlockId = block.id
        break
      }
    }

    result[block.id] = {
      label,
      sectionTitle,
      section: lastTitle,
      sectionBlockId: isSection ? block.id : lastSectionBlockId,
      isSection,
    }
  }

  return result
}

// ========== Form Field Sections ==========

/**
 * Groups sorted form fields into section groups for rendering.
 * Fields before any section-header go into an "orphan" group (sectionField: null).
 */
export function buildFormSectionGroups(sortedFields: FormField[]): FormSectionGroup[] {
  const groups: FormSectionGroup[] = []
  let currentGroup: FormSectionGroup | null = null

  for (const field of sortedFields) {
    if (field.type === 'section-header') {
      currentGroup = {
        sectionFieldId: field.id,
        sectionTitle: field.label || 'Seção sem título',
        sectionField: field,
        children: [],
      }
      groups.push(currentGroup)
    } else {
      if (!currentGroup) {
        // Orphan group — fields before any section-header
        currentGroup = {
          sectionFieldId: '__orphan__',
          sectionTitle: '',
          sectionField: null,
          children: [],
        }
        groups.push(currentGroup)
      }
      currentGroup.children.push(field)
    }
  }

  return groups
}

// ========== Pagination ==========

export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const totalElements = items.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)
  const start = safePage * size
  const content = items.slice(start, start + size)

  return {
    content,
    totalElements,
    totalPages,
    number: safePage,
    size,
    first: safePage === 0,
    last: safePage >= totalPages - 1,
    empty: content.length === 0,
  }
}
