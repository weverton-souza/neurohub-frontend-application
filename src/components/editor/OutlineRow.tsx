import { useState, useCallback, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  Block,
  BlockData,
  TextBlockData,
  ScoreTableData,
  ChartData,
  InfoBoxData,
  ReferencesData,
  ClosingPageData,
} from '@/types'
import {
  BLOCK_TYPE_LABELS,
  isSlateContent,
  slateContentToPlainText,
} from '@/types'
import { BLOCK_TYPE_BORDER_COLORS } from '@/lib/block-constants'
import type { BlockMeta } from '@/lib/utils'

// level 0 = section (title), level 1 = subsection (subtitle), level 2 = leaf (table/chart/etc)
interface OutlineRowProps {
  block: Block
  meta: BlockMeta
  level: 0 | 1 | 2
  onEdit: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onRemove: (blockId: string) => void
  onChange: (blockId: string, data: BlockData) => void
}

function getBlockBorderColor(block: Block, meta: BlockMeta): string {
  if (block.type !== 'text') return BLOCK_TYPE_BORDER_COLORS[block.type]
  const d = block.data as TextBlockData
  if (d.title && meta.isSection) return 'border-l-emerald-500'   // seção (título)
  if (d.subtitle) return 'border-l-teal-500'                     // subtítulo
  return 'border-l-sky-400'                                       // texto conteúdo
}

function getBlockSummary(block: Block): string {
  switch (block.type) {
    case 'score-table': {
      const d = block.data as ScoreTableData
      const rows = d.rows.length
      const cols = d.columns.length
      return `${rows} ${rows === 1 ? 'linha' : 'linhas'}, ${cols} ${cols === 1 ? 'coluna' : 'colunas'}`
    }
    case 'chart': {
      const d = block.data as ChartData
      const typeLabel = d.chartType === 'bar' ? 'Barras' : 'Linha'
      return `${typeLabel}, ${d.categories.length} categorias`
    }
    case 'info-box': {
      const d = block.data as InfoBoxData
      return d.content ? d.content.slice(0, 60) + (d.content.length > 60 ? '…' : '') : ''
    }
    case 'references': {
      const d = block.data as ReferencesData
      const count = d.references.filter((r) => r.trim()).length
      return `${count} ${count === 1 ? 'referência' : 'referências'}`
    }
    case 'closing-page': {
      const d = block.data as ClosingPageData
      const sigs = [
        d.showPatientSignature && 'Paciente',
        d.showMotherSignature && 'Mãe',
        d.showFatherSignature && 'Pai',
        d.showGuardianSignature && 'Responsável',
      ].filter(Boolean)
      return sigs.length > 0 ? `Assinaturas: ${sigs.join(', ')}` : ''
    }
    default:
      return ''
  }
}

function getBlockDisplayTitle(block: Block): string {
  switch (block.type) {
    case 'identification':
      return 'Identificação'
    case 'text': {
      const d = block.data as TextBlockData
      return d.title || d.subtitle || 'Texto'
    }
    case 'score-table': {
      const d = block.data as ScoreTableData
      return d.title || 'Tabela de Escores'
    }
    case 'chart': {
      const d = block.data as ChartData
      return d.title || 'Gráfico'
    }
    case 'info-box': {
      const d = block.data as InfoBoxData
      return d.label || 'Info Box'
    }
    case 'references': {
      const d = block.data as ReferencesData
      return d.title || 'Referências'
    }
    case 'closing-page': {
      const d = block.data as ClosingPageData
      return d.title || 'Termo de Entrega'
    }
    default:
      return BLOCK_TYPE_LABELS[block.type]
  }
}

function getContentPlainText(data: TextBlockData): string {
  if (isSlateContent(data.content)) return slateContentToPlainText(data.content)
  return typeof data.content === 'string' ? data.content : ''
}

function textBlockHasContent(data: TextBlockData): boolean {
  return !!getContentPlainText(data).trim()
}

export default function OutlineRow({
  block,
  meta,
  level,
  onEdit,
  onDuplicate,
  onRemove,
  onChange,
}: OutlineRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setConfirmingRemove(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  // Auto-reset confirm after 3 seconds
  useEffect(() => {
    if (!confirmingRemove) return
    const timer = setTimeout(() => setConfirmingRemove(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingRemove])

  const handleRemoveClick = useCallback(() => {
    if (level === 0) {
      // Sections: parent handles confirmation via modal
      onRemove(block.id)
      setShowMenu(false)
    } else if (confirmingRemove) {
      onRemove(block.id)
      setShowMenu(false)
      setConfirmingRemove(false)
    } else {
      setConfirmingRemove(true)
    }
  }, [level, confirmingRemove, onRemove, block.id])

  const isTextBlock = block.type === 'text'
  const textData = isTextBlock ? (block.data as TextBlockData) : null
  const hasContent = textData ? textBlockHasContent(textData) : false

  // Subtitle-only blocks are pure inline headers — no modal editing
  const isSubtitleOnly = isTextBlock && textData && !textData.title && !!textData.subtitle
  const showEditButton = isSubtitleOnly ? false : (!isTextBlock || hasContent)

  const displayTitle = getBlockDisplayTitle(block)
  const summary = getBlockSummary(block)

  // Inline title editing for text blocks
  const handleTitleChange = useCallback(
    (value: string) => {
      if (!textData) return
      onChange(block.id, { ...textData, title: value })
    },
    [block.id, textData, onChange]
  )

  const handleSubtitleChange = useCallback(
    (value: string) => {
      if (!textData) return
      onChange(block.id, { ...textData, subtitle: value })
    },
    [block.id, textData, onChange]
  )

  // Title style based on level
  const titleClass =
    level === 0
      ? 'text-sm font-semibold text-gray-800 uppercase tracking-wide'
      : level === 1 && isTextBlock
        ? 'text-sm font-medium text-gray-700'
        : 'text-sm text-gray-700'

  const placeholderClass =
    'placeholder:text-gray-400 placeholder:normal-case placeholder:tracking-normal'

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={`
        group flex items-center gap-2.5 px-4 py-4 rounded-lg border-l-4 transition-all
        ${getBlockBorderColor(block, meta)}
        ${isDragging ? 'opacity-50 shadow-lg bg-white z-10' : 'bg-white shadow-sm hover:shadow-md'}
      `}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab text-gray-300 hover:text-gray-500 focus:outline-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Title / Content area */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isTextBlock && textData ? (
          /* Text blocks: inline editable title, subtitle, or content preview */
          <div className="flex-1 min-w-0">
            {meta.isSection ? (
              <input
                type="text"
                value={textData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título da seção"
                className={`w-full bg-transparent border-0 p-0 ${titleClass} ${placeholderClass} focus:outline-none focus:ring-0`}
              />
            ) : textData.subtitle ? (
              <input
                type="text"
                value={textData.subtitle}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                placeholder="Subtítulo"
                className={`w-full bg-transparent border-0 p-0 ${titleClass} ${placeholderClass} focus:outline-none focus:ring-0`}
              />
            ) : (
              (() => {
                const plainText = getContentPlainText(textData)
                return (
                  <span
                    className="text-sm text-gray-500 italic truncate block cursor-pointer"
                    onDoubleClick={() => onEdit(block.id)}
                    title={plainText}
                  >
                    {plainText
                      ? plainText.slice(0, 80) + (plainText.length > 80 ? '…' : '')
                      : 'Texto vazio'}
                  </span>
                )
              })()
            )}
          </div>
        ) : (
          /* Non-text blocks: static display */
          <div className="flex-1 min-w-0">
            <span
              className={`${titleClass} truncate block`}
              onDoubleClick={() => onEdit(block.id)}
            >
              {displayTitle}
            </span>
            {summary && (
              <span className="text-xs text-gray-400 italic truncate block">
                {summary}
              </span>
            )}
          </div>
        )}

        {/* Content indicator for text blocks with content */}
        {isTextBlock && hasContent && (
          <span className="text-gray-400 shrink-0" title="Tem conteúdo">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 7.5a.75.75 0 01.75-.75h6.365a.75.75 0 010 1.5H2.75A.75.75 0 012 7.5zM14 7a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v6.59a.75.75 0 01-1.5 0V9.66l-1.95 2.1a.75.75 0 11-1.1-1.02l3.25-3.5A.75.75 0 0114 7zM2 11.25a.75.75 0 01.75-.75H7A.75.75 0 017 12H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </span>
        )}

        {/* Block type badge for leaf blocks */}
        {level === 2 && (
          <span className="text-xs text-gray-400 shrink-0 hidden group-hover:inline">
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit button */}
        {showEditButton && (
          <button
            type="button"
            onClick={() => onEdit(block.id)}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
            title="Editar"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
        )}

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
            title="Mais opções"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {/* Edit content option for text blocks without content (not subtitle-only) */}
              {isTextBlock && !hasContent && !isSubtitleOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    onEdit(block.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                  Editar conteúdo
                </button>
              )}

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => {
                  onDuplicate(block.id)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
                Duplicar
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={handleRemoveClick}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                  confirmingRemove
                    ? 'text-red-700 bg-red-50 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
                {level === 0 ? 'Excluir seção' : confirmingRemove ? 'Confirmar remoção' : 'Remover'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
