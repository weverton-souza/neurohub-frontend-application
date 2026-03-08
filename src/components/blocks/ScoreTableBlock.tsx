import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ScoreTableData, ScoreTableColumn, ScoreTableTemplate } from '@/types'
import { createEmptyScoreTableRow, createScoreTableColumn } from '@/types'
import { isFormulaColumn, computeCellResult, cellHasFormula, getCellFormulaText, getFormulaFunctions } from '@/lib/formula-engine'
import { adjustFormulaRefs, isFormula, remapFormulaRefs, indexToLetter } from '@/lib/formula-parser'
import { saveScoreTableTemplate, getTemplateCategories } from '@/lib/score-table-template-service'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { CloseIcon, PlusIcon } from '@/components/icons'

const FORMULA_HINTS: Record<string, { syntax: string; desc: string }> = {
  'SOMA': { syntax: 'SOMA(A1:A4)', desc: 'Soma valores (aceita ranges e células)' },
  'SUBTRACAO': { syntax: 'SUBTRACAO(B1;B2)', desc: 'Subtrai dois valores' },
  'MULTIPLICACAO': { syntax: 'MULTIPLICACAO(A1;B1)', desc: 'Multiplica dois valores' },
  'DIVISAO': { syntax: 'DIVISAO(A1;B1)', desc: 'Divide dois valores' },
  'MEDIA': { syntax: 'MEDIA(A1:A4)', desc: 'Média dos valores (aceita ranges)' },
  'MIN': { syntax: 'MIN(A1:A4)', desc: 'Menor valor (aceita ranges)' },
  'MAX': { syntax: 'MAX(A1:A4)', desc: 'Maior valor (aceita ranges)' },
  'ABS': { syntax: 'ABS(A1)', desc: 'Valor absoluto' },
  'ARRED': { syntax: 'ARRED(A1;2)', desc: 'Arredonda valor' },
  'PORCENTAGEM': { syntax: 'PORCENTAGEM(A1;B1)', desc: 'Calcula percentual' },
  'SE': { syntax: 'SE(A1>=10;"Alto";"Baixo")', desc: 'Condição se/então/senão' },
  'E': { syntax: 'E(A1>=5;A1<=10)', desc: 'E lógico' },
  'OU': { syntax: 'OU(A1>10;B1>10)', desc: 'Ou lógico' },
  'CLASSIFICAR': { syntax: 'CLASSIFICAR(C1;>=90;"Alto";>=50;"Médio";"Baixo")', desc: 'Classifica por faixas' },
  'CONT': { syntax: 'CONT(A1:A4)', desc: 'Conta valores (aceita ranges)' },
  'CONT.SE': { syntax: 'CONT.SE(A:A;>0)', desc: 'Conta com condição' },
  'CONCAT': { syntax: 'CONCAT(A1;" - ";B1)', desc: 'Concatena textos' },
}

const ALL_FUNCTIONS = getFormulaFunctions()

const COLOR_PRESETS = [
  '#27AE60', '#2ECC71', '#F1C40F', '#F39C12',
  '#E74C3C', '#C0392B', '#3498DB', '#2980B9',
  '#9B59B6', '#8E44AD', '#1ABC9C', '#E67E22',
]

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) {
    const v = Math.round(l * 255)
    return '#' + [v, v, v].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function AlignLeftIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="10" y2="8" />
      <line x1="2" y1="12" x2="12" y2="12" />
    </svg>
  )
}

function AlignCenterIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="4" y1="8" x2="12" y2="8" />
      <line x1="3" y1="12" x2="13" y2="12" />
    </svg>
  )
}

function AlignRightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="6" y1="8" x2="14" y2="8" />
      <line x1="4" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function AlignIcon({ alignment, size = 12 }: { alignment: 'left' | 'center' | 'right'; size?: number }) {
  if (alignment === 'left') return <AlignLeftIcon size={size} />
  if (alignment === 'right') return <AlignRightIcon size={size} />
  return <AlignCenterIcon size={size} />
}

const ALIGN_LABELS: Record<string, string> = { left: 'Esquerda', center: 'Centro', right: 'Direita' }

function alignClass(col: ScoreTableColumn): string {
  const a = col.alignment ?? 'center'
  return a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center'
}

function GripDotsIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.5" />
      <circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="11" cy="13" r="1.5" />
    </svg>
  )
}

function SortableRow({ id, rowIndex, children }: { id: string; rowIndex: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
    >
      <td
        className="w-10 px-1 py-1 text-center text-[10px] font-semibold text-gray-400 bg-gray-50 border-r border-gray-200 select-none cursor-grab active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <div className="flex items-center justify-center gap-0.5">
          <GripDotsIcon size={10} />
          <span>{rowIndex + 1}</span>
        </div>
      </td>
      {children}
    </tr>
  )
}


function SortableTh({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <th ref={setNodeRef} style={style} className={className} {...attributes}>
      <div className="flex items-center gap-1">
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 transition-colors"
          {...listeners}
        >
          <GripDotsIcon size={10} />
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </th>
  )
}

function remapAllFormulas(
  data: ScoreTableData,
  colMap: Map<number, number>,
  rowMap: Map<number, number>,
): ScoreTableData {
  const hasColMap = colMap.size > 0
  const hasRowMap = rowMap.size > 0
  if (!hasColMap && !hasRowMap) return data

  const columns = data.columns.map(col => {
    if (!col.formula) return col
    const remapped = remapFormulaRefs(col.formula, colMap, rowMap)
    return remapped !== col.formula ? { ...col, formula: remapped } : col
  })

  const rows = data.rows.map(row => {
    let changed = false
    const newValues = { ...row.values }
    for (const colId of Object.keys(newValues)) {
      const val = newValues[colId]
      if (val && isFormula(val)) {
        const remapped = remapFormulaRefs(val, colMap, rowMap)
        if (remapped !== val) {
          newValues[colId] = remapped
          changed = true
        }
      }
    }
    return changed ? { ...row, values: newValues } : row
  })

  return { ...data, columns, rows }
}

interface ScoreTableBlockProps {
  data: ScoreTableData
  onChange: (data: ScoreTableData) => void
}

export default function ScoreTableBlock({ data, onChange }: ScoreTableBlockProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingCellId, setEditingCellId] = useState<string | null>(null) // "rowId:colId"
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateInstrument, setTemplateInstrument] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [acIndex, setAcIndex] = useState(0)
  const [acPos, setAcPos] = useState<{ top: number; left: number; height: number } | null>(null)
  const [cpHex, setCpHex] = useState('')
  const [cpPos, setCpPos] = useState<{ top: number; left: number } | null>(null)
  const [cpEditIndex, setCpEditIndex] = useState<number | null>(null)
  const [cpBaseHsl, setCpBaseHsl] = useState<[number, number, number] | null>(null)
  const [applyAllPrompt, setApplyAllPrompt] = useState<{
    lightness: number
    otherColors: { rowId: string; colId: string; index: number; color: string }[]
  } | null>(null)
  const [replicatePrompt, setReplicatePrompt] = useState<{
    formula: string
    rowId: string
    colId: string
  } | null>(null)
  const [overwritePrompt, setOverwritePrompt] = useState<{
    targets: { rowId: string; colId: string; formula: string }[]
    conflicts: { rowId: string; colId: string; formula: string; existing: string }[]
  } | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const formulaBarRef = useRef<HTMLInputElement>(null)
  const formulaBarContainerRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const acRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  // Reset color picker state when cell changes
  useEffect(() => { setCpEditIndex(null); setCpBaseHsl(null) }, [editingCellId])

  // Blur handler: don't clear editingCellId if focus moves between cell and formula bar
  const handleCellBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if (related && (related === formulaBarRef.current || tableRef.current?.contains(related) || colorPickerRef.current?.contains(related))) return
    setEditingCellId(null)
  }, [])

  const handleFormulaBarBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if (related && (tableRef.current?.contains(related) || colorPickerRef.current?.contains(related))) return
    setEditingCellId(null)
  }, [])

  // Focus input when editing a column name
  useEffect(() => {
    if (editingColumnId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingColumnId])

  const addColumn = useCallback(() => {
    const newCol = createScoreTableColumn('')
    const updatedRows = data.rows.map((row) => ({
      ...row,
      values: { ...row.values, [newCol.id]: '' },
    }))
    onChange({
      ...data,
      columns: [...data.columns, newCol],
      rows: updatedRows,
    })
    setEditingColumnId(newCol.id)
  }, [data, onChange])

  const removeColumn = useCallback(
    (colId: string) => {
      const columns = data.columns.filter((c) => c.id !== colId)
      const rows = data.rows.map((row) => {
        const values = { ...row.values }
        delete values[colId]
        return { ...row, values }
      })
      onChange({ ...data, columns, rows })
    },
    [data, onChange]
  )

  const renameColumn = useCallback(
    (colId: string, label: string) => {
      const columns = data.columns.map((c) =>
        c.id === colId ? { ...c, label } : c
      )
      onChange({ ...data, columns })
    },
    [data, onChange]
  )

  const cycleAlignment = useCallback((colId: string) => {
    const order: ('left' | 'center' | 'right')[] = ['left', 'center', 'right']
    const col = data.columns.find(c => c.id === colId)
    const current = col?.alignment ?? 'center'
    const next = order[(order.indexOf(current) + 1) % 3]
    const columns = data.columns.map(c => c.id === colId ? { ...c, alignment: next } : c)
    onChange({ ...data, columns })
  }, [data, onChange])

  const addRow = useCallback(() => {
    onChange({
      ...data,
      rows: [...data.rows, createEmptyScoreTableRow(data.columns)],
    })
  }, [data, onChange])

  const updateCell = useCallback(
    (rowId: string, colId: string, value: string) => {
      // Auto-uppercase quando começa com =
      const finalValue = value.trimStart().startsWith('=') ? value.toUpperCase() : value
      const rows = data.rows.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [colId]: finalValue } }
          : row
      )
      onChange({ ...data, rows })
    },
    [data, onChange]
  )

  const removeRow = useCallback(
    (rowId: string) => {
      const rows = data.rows.filter((row) => row.id !== rowId)
      onChange({ ...data, rows })
    },
    [data, onChange]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Row reorder
    if (activeId.startsWith('row-') && overId.startsWith('row-')) {
      const activeRowId = activeId.slice(4)
      const overRowId = overId.slice(4)
      const oldIndex = data.rows.findIndex(r => r.id === activeRowId)
      const newIndex = data.rows.findIndex(r => r.id === overRowId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newRows = [...data.rows]
      const [moved] = newRows.splice(oldIndex, 1)
      newRows.splice(newIndex, 0, moved)

      // Build row mapping: old 1-based → new 1-based
      const rowMap = new Map<number, number>()
      for (let i = 0; i < data.rows.length; i++) {
        const rowId = data.rows[i].id
        const newPos = newRows.findIndex(r => r.id === rowId)
        if (i !== newPos) {
          rowMap.set(i + 1, newPos + 1)
        }
      }

      const updated = remapAllFormulas({ ...data, rows: newRows }, new Map(), rowMap)
      onChange(updated)
    }

    // Column reorder
    if (activeId.startsWith('col-') && overId.startsWith('col-')) {
      const activeColId = activeId.slice(4)
      const overColId = overId.slice(4)
      const oldIndex = data.columns.findIndex(c => c.id === activeColId)
      const newIndex = data.columns.findIndex(c => c.id === overColId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newColumns = [...data.columns]
      const [moved] = newColumns.splice(oldIndex, 1)
      newColumns.splice(newIndex, 0, moved)

      // Build col mapping: old 0-based → new 0-based
      const colMap = new Map<number, number>()
      for (let i = 0; i < data.columns.length; i++) {
        const colId = data.columns[i].id
        const newPos = newColumns.findIndex(c => c.id === colId)
        if (i !== newPos) {
          colMap.set(i, newPos)
        }
      }

      const updated = remapAllFormulas({ ...data, columns: newColumns }, colMap, new Map())
      onChange(updated)
    }
  }, [data, onChange])

  // Active cell reference (e.g. "B4") and content for formula bar
  const activeCellRef = (() => {
    if (!editingCellId) return ''
    const [rowId, colId] = editingCellId.split(':')
    const colIdx = data.columns.findIndex((c) => c.id === colId)
    const rowIdx = data.rows.findIndex((r) => r.id === rowId)
    if (colIdx === -1 || rowIdx === -1) return ''
    return `${indexToLetter(colIdx)}${rowIdx + 1}`
  })()

  const activeBarValue = (() => {
    if (!editingCellId) return ''
    const [rowId, colId] = editingCellId.split(':')
    if (!rowId || !colId) return ''
    const row = data.rows.find((r) => r.id === rowId)
    const rawValue = row?.values[colId] ?? ''
    // Mostra raw se tem conteúdo, senão fórmula da coluna se existir
    if (rawValue) return rawValue
    const col = data.columns.find((c) => c.id === colId)
    return col?.formula ?? ''
  })()

  const handleFormulaBarChange = (value: string) => {
    if (!editingCellId) return
    const [rowId, colId] = editingCellId.split(':')
    if (!rowId || !colId) return
    updateCell(rowId, colId, value)
  }

  // ========== Formula Autocomplete ==========

  // Extract the function token being typed (after last = ( or ;)
  const acData = useMemo(() => {
    const value = activeBarValue
    if (!value || !value.trim().startsWith('=')) return null

    let tokenStart = -1
    for (let i = value.length - 1; i >= 0; i--) {
      const ch = value[i]
      if (ch === '=' || ch === '(' || ch === ';') {
        tokenStart = i + 1
        break
      }
      if (!/[A-Za-z.]/.test(ch)) return null
    }
    if (tokenStart === -1) return null

    const token = value.slice(tokenStart).toUpperCase()

    // Token vazio (acabou de digitar = ou ( ou ;) → mostra todas
    const matches = token
      ? ALL_FUNCTIONS.filter(fn => fn.startsWith(token))
      : [...ALL_FUNCTIONS]
    if (matches.length === 0) return null
    // Esconde se digitou exatamente o nome completo da função
    if (matches.length === 1 && matches[0] === token) return null

    return { matches, token, tokenStart }
  }, [activeBarValue])

  // Reset index when suggestions change
  useEffect(() => {
    setAcIndex(0)
  }, [acData?.token])

  // Calculate position aligned with the Modal card
  useEffect(() => {
    if (!acData || !formulaBarContainerRef.current) {
      setAcPos(null)
      return
    }
    // Find the Modal panel (closest .rounded-xl ancestor)
    let modalEl: HTMLElement | null = formulaBarContainerRef.current
    while (modalEl && !modalEl.classList.contains('rounded-xl')) {
      modalEl = modalEl.parentElement
    }
    if (modalEl) {
      const cardRect = modalEl.getBoundingClientRect()
      setAcPos({ top: cardRect.top, left: cardRect.right + 12, height: cardRect.height })
    } else {
      const rect = formulaBarContainerRef.current.getBoundingClientRect()
      setAcPos({ top: rect.top, left: rect.right + 12, height: 400 })
    }
  }, [acData])

  // Extrai todas as cores @#RRGGBB da fórmula (posição + cor)
  const formulaColors = useMemo(() => {
    if (!activeBarValue) return []
    const matches: { index: number; color: string }[] = []
    const regex = /@#([0-9A-Fa-f]{6})/g
    let m
    while ((m = regex.exec(activeBarValue)) !== null) {
      matches.push({ index: m.index, color: '#' + m[1].toUpperCase() })
    }
    return matches
  }, [activeBarValue])

  // Detecta se o cursor está em posição @# para abrir color picker (digitando novo)
  const showColorPickerNew = useMemo(() => {
    if (!activeBarValue || !activeBarValue.trim().startsWith('=')) return false
    const match = activeBarValue.match(/@#([0-9A-Fa-f]{0,5})$/)
    return !!match
  }, [activeBarValue])

  // Mostrar color picker: ou digitando novo @# ou editando chip existente
  const showColorPicker = showColorPickerNew || cpEditIndex !== null

  // Posição do color picker (abaixo da formula bar)
  useEffect(() => {
    if (!showColorPicker || !formulaBarContainerRef.current) {
      setCpPos(null)
      return
    }
    const rect = formulaBarContainerRef.current.getBoundingClientRect()
    setCpPos({ top: rect.bottom + 4, left: rect.left })
  }, [showColorPicker])

  const handleColorSelect = useCallback((color: string) => {
    if (!editingCellId) return
    const [rowId, colId] = editingCellId.split(':')
    if (!rowId || !colId) return

    if (cpEditIndex !== null) {
      // Editando cor existente: substituir o @#RRGGBB no índice específico
      const fc = formulaColors[cpEditIndex]
      if (fc) {
        const before = activeBarValue.slice(0, fc.index)
        const after = activeBarValue.slice(fc.index + 8) // "@#RRGGBB" = 8 chars
        const newValue = before + '@' + color.toUpperCase() + after
        updateCell(rowId, colId, newValue)
      }
      setCpEditIndex(null)
    } else {
      // Inserindo nova cor: remove @# parcial do final e insere @#RRGGBB completo
      const cleaned = activeBarValue.replace(/@#[0-9A-Fa-f]{0,6}$/, '')
      const newValue = cleaned + '@' + color.toUpperCase()
      updateCell(rowId, colId, newValue)
    }
  }, [editingCellId, activeBarValue, updateCell, cpEditIndex, formulaColors])

  const handleAcSelect = useCallback((funcName: string) => {
    if (!editingCellId || !acData) return
    const [rowId, colId] = editingCellId.split(':')
    if (!rowId || !colId) return

    const newValue = activeBarValue.slice(0, acData.tokenStart) + funcName + '('
    updateCell(rowId, colId, newValue)
  }, [editingCellId, acData, activeBarValue, updateCell])

  // Shared keyboard handler — returns true if handled
  const handleAcKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    if (!acData) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAcIndex(prev => (prev + 1) % acData.matches.length)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAcIndex(prev => (prev - 1 + acData.matches.length) % acData.matches.length)
      return true
    }
    if (e.key === 'Tab' || (e.key === 'Enter' && acData.matches.length > 0)) {
      e.preventDefault()
      handleAcSelect(acData.matches[acIndex])
      return true
    }
    return false
  }, [acData, acIndex, handleAcSelect])

  const triggerReplicatePrompt = useCallback(() => {
    if (!editingCellId) return
    const [rowId, colId] = editingCellId.split(':')
    const row = data.rows.find(r => r.id === rowId)
    if (!row) return
    const val = row.values[colId] ?? ''
    if (isFormula(val)) {
      setReplicatePrompt({ formula: val.toUpperCase(), rowId, colId })
    }
  }, [editingCellId, data])

  const handleFormulaBarKeyDown = (e: React.KeyboardEvent) => {
    if (handleAcKeyDown(e)) return
    if (e.key === 'Enter') {
      triggerReplicatePrompt()
      setEditingCellId(null)
    }
    if (e.key === 'Escape') {
      setEditingCellId(null)
    }
  }

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (handleAcKeyDown(e)) return
    if (e.key === 'Enter') {
      triggerReplicatePrompt()
      setEditingCellId(null)
    }
    if (e.key === 'Escape') setEditingCellId(null)
  }, [handleAcKeyDown, triggerReplicatePrompt])

  const openSaveTemplateModal = () => {
    setTemplateName(data.title || '')
    setTemplateDescription('')
    setTemplateInstrument('')
    setTemplateCategory('')
    setShowSaveTemplate(true)
  }

  const handleSaveTemplate = () => {
    const template: ScoreTableTemplate = {
      id: `tpl-custom-${crypto.randomUUID()}`,
      name: templateName.trim(),
      description: templateDescription.trim(),
      instrumentName: templateInstrument.trim(),
      category: templateCategory.trim(),
      columns: data.columns.map(c => ({
        id: c.id,
        label: c.label,
        formula: c.formula ?? null,
      })),
      rows: data.rows.map(r => ({
        id: r.id,
        defaultValues: { ...r.values },
      })),
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveScoreTableTemplate(template)
    setShowSaveTemplate(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  const canSaveTemplate = templateName.trim() && templateInstrument.trim() && templateCategory.trim()
  const existingCategories = showSaveTemplate ? getTemplateCategories() : []

  // ========== Replicar fórmula ==========

  const applyReplicatedFormulas = useCallback((cells: { rowId: string; colId: string; formula: string }[]) => {
    const newRows = data.rows.map(row => {
      const updates = cells.filter(c => c.rowId === row.id)
      if (updates.length === 0) return row
      const newValues = { ...row.values }
      for (const u of updates) {
        newValues[u.colId] = u.formula
      }
      return { ...row, values: newValues }
    })
    onChange({ ...data, rows: newRows })
  }, [data, onChange])

  const handleReplicate = useCallback((direction: 'row' | 'column') => {
    if (!replicatePrompt) return
    const { formula, rowId, colId } = replicatePrompt

    const sourceColIndex = data.columns.findIndex(c => c.id === colId)
    const sourceRowIndex = data.rows.findIndex(r => r.id === rowId)
    if (sourceColIndex < 0 || sourceRowIndex < 0) return

    const targets: { rowId: string; colId: string; formula: string }[] = []
    const conflicts: { rowId: string; colId: string; formula: string; existing: string }[] = []

    if (direction === 'column') {
      for (let ri = 0; ri < data.rows.length; ri++) {
        if (ri === sourceRowIndex) continue
        const deltaRow = ri - sourceRowIndex
        const adjusted = adjustFormulaRefs(formula, 0, deltaRow)
        const targetRow = data.rows[ri]
        const existing = targetRow.values[colId] ?? ''
        if (isFormula(existing)) {
          conflicts.push({ rowId: targetRow.id, colId, formula: adjusted, existing })
        } else {
          targets.push({ rowId: targetRow.id, colId, formula: adjusted })
        }
      }
    } else {
      for (let ci = 0; ci < data.columns.length; ci++) {
        if (ci === sourceColIndex) continue
        const deltaCol = ci - sourceColIndex
        const adjusted = adjustFormulaRefs(formula, deltaCol, 0)
        const targetCol = data.columns[ci]
        const existing = data.rows[sourceRowIndex].values[targetCol.id] ?? ''
        if (isFormula(existing)) {
          conflicts.push({ rowId, colId: targetCol.id, formula: adjusted, existing })
        } else {
          targets.push({ rowId, colId: targetCol.id, formula: adjusted })
        }
      }
    }

    if (conflicts.length === 0) {
      applyReplicatedFormulas(targets)
      setReplicatePrompt(null)
    } else {
      setOverwritePrompt({ targets, conflicts })
      setReplicatePrompt(null)
    }
  }, [replicatePrompt, data, applyReplicatedFormulas])

  const handleOverwriteAll = useCallback(() => {
    if (!overwritePrompt) return
    const all = [...overwritePrompt.targets, ...overwritePrompt.conflicts.map(c => ({ rowId: c.rowId, colId: c.colId, formula: c.formula }))]
    applyReplicatedFormulas(all)
    setOverwritePrompt(null)
  }, [overwritePrompt, applyReplicatedFormulas])

  const handleOverwriteSkip = useCallback(() => {
    if (!overwritePrompt) return
    applyReplicatedFormulas(overwritePrompt.targets)
    setOverwritePrompt(null)
  }, [overwritePrompt, applyReplicatedFormulas])

  const findAllTableColors = useCallback((excludeCellKey?: string) => {
    const results: { rowId: string; colId: string; index: number; color: string }[] = []
    const regex = /@#([0-9A-Fa-f]{6})/g
    for (const row of data.rows) {
      for (const col of data.columns) {
        const cellKey = `${row.id}:${col.id}`
        if (cellKey === excludeCellKey) continue
        const val = row.values[col.id] ?? ''
        let m
        regex.lastIndex = 0
        while ((m = regex.exec(val)) !== null) {
          results.push({ rowId: row.id, colId: col.id, index: m.index, color: '#' + m[1].toUpperCase() })
        }
      }
    }
    return results
  }, [data])

  const applyLightnessToAll = useCallback((targets: { rowId: string; colId: string; index: number; color: string }[], newLightness: number) => {
    const newRows = data.rows.map(row => {
      const newValues = { ...row.values }
      for (const target of targets) {
        if (target.rowId !== row.id) continue
        const val = newValues[target.colId] ?? ''
        const [h, s] = hexToHsl(target.color)
        const newHex = hslToHex(h, s, newLightness)
        const oldAnnotation = '@' + target.color.toUpperCase()
        const newAnnotation = '@' + newHex.toUpperCase()
        newValues[target.colId] = val.replace(oldAnnotation, newAnnotation)
      }
      return { ...row, values: newValues }
    })
    onChange({ ...data, rows: newRows })
  }, [data, onChange])

  const handleWrapperClick = useCallback((e: React.MouseEvent) => {
    if (!editingCellId) return
    const target = e.target as HTMLElement
    if (tableRef.current?.contains(target)) return
    if (formulaBarContainerRef.current?.contains(target)) return
    if (colorPickerRef.current?.contains(target)) return
    if (acRef.current?.contains(target)) return
    setEditingCellId(null)
  }, [editingCellId])

  return (
    <div className="space-y-4" onClick={handleWrapperClick}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Input
            label="Título da tabela"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Título da tabela"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={openSaveTemplateModal}
          disabled={data.columns.length === 0}
          className="mt-6 whitespace-nowrap"
        >
          {savedFeedback ? 'Template salvo!' : 'Salvar como Template'}
        </Button>
      </div>

      {/* Formula bar */}
      <div ref={formulaBarContainerRef} className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Cell reference */}
        <div className="flex items-center justify-center px-3 py-1.5 bg-gray-50 border-r border-gray-200 min-w-[56px]">
          <span className="text-xs font-semibold text-gray-600 font-mono">
            {activeCellRef || '\u00A0'}
          </span>
        </div>
        {/* fx label */}
        <div className="flex items-center px-2 border-r border-gray-200">
          <span className="text-xs font-bold text-gray-400">fx</span>
        </div>
        {/* Formula / value input */}
        <input
          ref={formulaBarRef}
          type="text"
          value={activeBarValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          onKeyDown={handleFormulaBarKeyDown}
          onBlur={handleFormulaBarBlur}
          disabled={!editingCellId}
          className="flex-1 px-3 py-1.5 text-xs font-mono text-gray-800 bg-white focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          placeholder={editingCellId ? 'Digite um valor ou fórmula...' : ''}
        />
        {/* Color chips inline na formula bar */}
        {formulaColors.length > 0 && (
          <div className="flex items-center gap-1 px-2 border-l border-gray-200">
            {formulaColors.map((fc, i) => (
              <button
                key={`${i}-${fc.color}`}
                type="button"
                className="w-5 h-5 rounded border border-gray-300 hover:border-gray-500 hover:scale-125 transition-all shrink-0"
                style={{ backgroundColor: fc.color }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setCpEditIndex(i)
                  setCpBaseHsl(hexToHsl(fc.color))
                  setCpHex(fc.color.slice(1))
                }}
                title={`Alterar ${fc.color}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Formula autocomplete — portal ao lado direito do card */}
      {acData && acPos && createPortal(
        (() => {
          const selectedFn = acData.matches[acIndex]
          const selectedHint = FORMULA_HINTS[selectedFn]
          return (
            <div
              ref={acRef}
              className="fixed w-64 z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col"
              style={{ top: acPos.top, left: acPos.left, maxHeight: acPos.height }}
            >
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Funções ({acData.matches.length})
                </div>
              </div>

              {/* Lista de funções */}
              <div className="flex-1 overflow-y-auto">
                {acData.matches.map((fn, i) => {
                  const hint = FORMULA_HINTS[fn]
                  return (
                    <button
                      key={fn}
                      type="button"
                      className={`w-full text-left px-4 py-2 transition-colors border-l-2 ${
                        i === acIndex
                          ? 'bg-brand-50 border-l-brand-600 text-brand-700'
                          : 'border-l-transparent text-gray-700 hover:bg-gray-50'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleAcSelect(fn)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand-400">fx</span>
                        <span className="text-xs font-semibold font-mono">{fn}</span>
                      </div>
                      {hint && (
                        <div className="text-[10px] text-gray-400 mt-0.5 ml-6">{hint.desc}</div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Detalhe da função selecionada */}
              {selectedHint && (
                <div className="px-4 py-2.5 bg-brand-50 shrink-0 rounded-b-xl border-t border-brand-100">
                  <div className="font-mono font-bold text-xs text-brand-700">{selectedHint.syntax}</div>
                  <div className="text-brand-500 text-[10px] mt-0.5">{selectedHint.desc}</div>
                </div>
              )}
            </div>
          )
        })(),
        document.body
      )}

      {/* Color picker — portal abaixo da formula bar */}
      {showColorPicker && cpPos && createPortal(
        (() => {
          const adjustedColor = cpBaseHsl ? hslToHex(cpBaseHsl[0], cpBaseHsl[1], cpBaseHsl[2]) : null
          const sliderGradient = cpBaseHsl
            ? `linear-gradient(to right, ${hslToHex(cpBaseHsl[0], cpBaseHsl[1], 0.1)}, ${hslToHex(cpBaseHsl[0], cpBaseHsl[1], 0.5)}, ${hslToHex(cpBaseHsl[0], cpBaseHsl[1], 0.9)})`
            : undefined
          return (
            <div
              ref={colorPickerRef}
              className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl p-3"
              style={{ top: cpPos.top, left: cpPos.left, width: 260 }}
              onMouseDown={(e) => {
                // Allow native behavior for inputs (range slider, hex field)
                if ((e.target as HTMLElement).tagName === 'INPUT') return
                e.preventDefault()
              }}
              onBlur={(e) => {
                const related = e.relatedTarget as HTMLElement | null
                if (related && (related === formulaBarRef.current || tableRef.current?.contains(related) || colorPickerRef.current?.contains(related))) return
                setEditingCellId(null)
              }}
            >
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Escolha uma cor
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-lg border-2 transition-colors hover:scale-110 ${
                      adjustedColor && cpBaseHsl && hslToHex(hexToHsl(color)[0], hexToHsl(color)[1], cpBaseHsl[2]) === adjustedColor
                        ? 'border-gray-600 ring-1 ring-gray-400'
                        : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      const hsl = hexToHsl(color)
                      setCpBaseHsl(hsl)
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Slider de intensidade */}
              {cpBaseHsl && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Intensidade</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded border border-gray-300"
                        style={{ backgroundColor: adjustedColor! }}
                      />
                      <span className="text-[10px] font-mono text-gray-500">{adjustedColor}</span>
                    </div>
                  </div>
                  <div className="relative h-6 flex items-center">
                    <div
                      className="absolute inset-x-0 h-3 rounded-full"
                      style={{ background: sliderGradient }}
                    />
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={Math.round(cpBaseHsl[2] * 100)}
                      onChange={(e) => {
                        const l = parseInt(e.target.value) / 100
                        setCpBaseHsl([cpBaseHsl[0], cpBaseHsl[1], l])
                      }}
                      className="relative w-full h-3 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
                    />
                  </div>
                  <div className="relative h-4 mt-0.5 mx-0.5">
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => (
                      <div
                        key={v}
                        className="absolute flex flex-col items-center -translate-x-1/2"
                        style={{ left: `${((v - 10) / 80) * 100}%` }}
                      >
                        <div className="w-px h-1 bg-gray-300" />
                        <span className="text-[7px] text-gray-400 leading-none mt-px">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ backgroundColor: adjustedColor! }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleColorSelect(adjustedColor!)
                      const currentLightness = cpBaseHsl[2]
                      const others = findAllTableColors(editingCellId ?? undefined)
                      const withDiffLightness = others.filter(oc => {
                        const [, , l] = hexToHsl(oc.color)
                        return Math.abs(l - currentLightness) > 0.02
                      })
                      if (withDiffLightness.length > 0) {
                        setApplyAllPrompt({ lightness: currentLightness, otherColors: withDiffLightness })
                      }
                      setCpBaseHsl(null)
                    }}
                  >
                    Aplicar {adjustedColor}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">#</span>
                <input
                  type="text"
                  value={cpHex}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
                    setCpHex(val)
                    if (val.length === 6) {
                      setCpBaseHsl(hexToHsl('#' + val.toUpperCase()))
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && cpHex.length === 6) {
                      e.preventDefault()
                      const color = cpBaseHsl ? hslToHex(cpBaseHsl[0], cpBaseHsl[1], cpBaseHsl[2]) : '#' + cpHex.toUpperCase()
                      handleColorSelect(color)
                      setCpHex('')
                      setCpBaseHsl(null)
                    }
                  }}
                  placeholder="RRGGBB"
                  className="flex-1 text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  maxLength={6}
                />
                {cpHex.length === 6 && !cpBaseHsl && (
                  <button
                    type="button"
                    className="w-6 h-6 rounded border border-gray-200"
                    style={{ backgroundColor: '#' + cpHex }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleColorSelect('#' + cpHex.toUpperCase())
                      setCpHex('')
                    }}
                    title="Aplicar cor"
                  />
                )}
              </div>
            </div>
          )
        })(),
        document.body
      )}

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table ref={tableRef} className="w-full text-sm">
            <thead>
              {/* Letter row (A, B, C...) */}
              <tr className="bg-gray-100 border-b border-gray-200">
                {/* Empty corner for row numbers */}
                <th className="w-10 px-1 py-1 border-r border-gray-200" />
                {data.columns.map((_col, idx) => (
                  <th
                    key={`letter-${idx}`}
                    className="px-3 py-1 text-center text-[10px] font-semibold text-gray-500 min-w-[120px]"
                  >
                    {indexToLetter(idx)}
                  </th>
                ))}
                <th className="w-12" />
                <th className="w-8" />
              </tr>
              {/* Column names row */}
              <tr className="bg-brand-700">
                {/* Row number header */}
                <th className="w-10 px-1 py-2 bg-gray-100 border-r border-gray-200" />
                <SortableContext items={data.columns.map(c => `col-${c.id}`)} strategy={horizontalListSortingStrategy}>
                  {data.columns.map((col) => {
                    const hasFormula = isFormulaColumn(col)
                    return (
                      <SortableTh
                        key={col.id}
                        id={`col-${col.id}`}
                        className={`px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-white min-w-[120px] ${
                          hasFormula ? 'bg-brand-800' : ''
                        }`}
                      >
                        {editingColumnId === col.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={col.label}
                            onChange={(e) => renameColumn(col.id, e.target.value)}
                            onBlur={() => setEditingColumnId(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingColumnId(null)
                            }}
                            className="bg-white/20 text-white placeholder:text-white/50 border-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider w-full focus:outline-none focus:ring-1 focus:ring-white/50 text-center"
                            placeholder="Nome da coluna"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 group">
                            <span
                              className="truncate cursor-pointer hover:underline"
                              onClick={() => setEditingColumnId(col.id)}
                              title="Clique para renomear"
                            >
                              {col.label || 'Sem nome'}
                            </span>
                            {hasFormula && (
                              <span
                                className="px-1 py-0.5 text-[9px] font-bold bg-white/20 rounded shrink-0"
                                title={col.formula!}
                              >
                                fx
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => cycleAlignment(col.id)}
                              className="p-0.5 rounded hover:bg-white/20 text-white/60 hover:text-white transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              title={`Alinhamento: ${ALIGN_LABELS[col.alignment ?? 'center']}`}
                            >
                              <AlignIcon alignment={col.alignment ?? 'center'} size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeColumn(col.id)}
                              className="p-0.5 rounded hover:bg-white/20 text-white/40 hover:text-white transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                              title="Remover coluna"
                            >
                              <CloseIcon size={12} />
                            </button>
                          </div>
                        )}
                      </SortableTh>
                    )
                  })}
                </SortableContext>
                {/* Add column button */}
                <th className="w-12 px-1 py-2">
                  <button
                    type="button"
                    onClick={addColumn}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white/70 hover:text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                    title="Adicionar coluna"
                  >
                    <PlusIcon size={14} />
                  </button>
                </th>
                {/* Row delete column */}
                <th className="w-8" />
              </tr>
            </thead>
            <SortableContext items={data.rows.map(r => `row-${r.id}`)} strategy={verticalListSortingStrategy}>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.columns.length + 3}
                      className="px-3 py-6 text-center text-gray-400 text-sm"
                    >
                      Nenhuma linha adicionada. Clique em &quot;Adicionar linha&quot; abaixo.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, rowIndex) => (
                    <SortableRow key={row.id} id={`row-${row.id}`} rowIndex={rowIndex}>
                      {data.columns.map((col) => {
                        const cellKey = `${row.id}:${col.id}`
                        const isActive = editingCellId === cellKey
                        const rawValue = row.values[col.id] ?? ''
                        const hasFormulaCell = cellHasFormula(data, row.id, col.id)
                        const formulaText = hasFormulaCell ? getCellFormulaText(data, row.id, col.id) : ''
                        const cellResult = hasFormulaCell ? computeCellResult(data, row.id, col.id) : null
                        const displayValue = cellResult ? cellResult.text : rawValue

                        // Célula ativa: sempre input editável (fórmula ou valor)
                        if (isActive) {
                          return (
                            <td key={col.id} className={`px-1 py-1 ${hasFormulaCell ? 'bg-blue-100' : ''}`}>
                              <input
                                type="text"
                                autoFocus
                                value={rawValue || formulaText}
                                onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                className={`w-full bg-white border border-brand-400 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded font-mono text-xs ${alignClass(col)}`}
                                placeholder="-"
                              />
                            </td>
                          )
                        }

                        // Célula inativa com fórmula: mostra resultado calculado (com cor opcional)
                        if (hasFormulaCell && cellResult) {
                          const hasBgColor = !!cellResult.bgColor
                          return (
                            <td
                              key={col.id}
                              className="px-1 py-1"
                              style={hasBgColor ? { backgroundColor: cellResult.bgColor } : undefined}
                            >
                              <div
                                className={`w-full px-2 py-1.5 text-sm cursor-pointer rounded flex items-center gap-1 ${alignClass(col)} ${
                                  hasBgColor ? 'hover:opacity-80' : 'text-gray-700 bg-blue-50 hover:bg-blue-100/50'
                                }`}
                                style={hasBgColor ? { color: cellResult.textColor } : undefined}
                                onClick={() => setEditingCellId(cellKey)}
                              >
                                <span className="flex-1">{displayValue || '-'}</span>
                                <span
                                  className={`text-[9px] font-bold shrink-0 ${
                                    hasBgColor ? 'opacity-60' : 'text-blue-500'
                                  }`}
                                  style={hasBgColor ? { color: cellResult.textColor } : undefined}
                                >
                                  fx
                                </span>
                              </div>
                            </td>
                          )
                        }

                        // Célula normal (sem fórmula)
                        return (
                          <td key={col.id} className="px-1 py-1">
                            <input
                              type="text"
                              value={rawValue}
                              onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                              onFocus={() => setEditingCellId(cellKey)}
                              onBlur={handleCellBlur}
                              className={`w-full bg-transparent border-0 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded ${alignClass(col)}`}
                              placeholder="-"
                            />
                          </td>
                        )
                      })}
                      {/* Empty cell for add-column column */}
                      <td className="w-12" />
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover linha"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </td>
                    </SortableRow>
                  ))
                )}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </DndContext>

      <Button variant="ghost" size="sm" onClick={addRow}>
        + Adicionar linha
      </Button>

      <Input
        label="Nota de rodapé"
        value={data.footnote}
        onChange={(e) => onChange({ ...data, footnote: e.target.value })}
        placeholder="Nota de rodapé (opcional)"
      />

      {/* Modal salvar como template */}
      <Modal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        title="Salvar como Template"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex: Meu Template WAIS"
          />
          <Input
            label="Instrumento *"
            value={templateInstrument}
            onChange={(e) => setTemplateInstrument(e.target.value)}
            placeholder="Ex: WAIS-III, RAVLT"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria *
            </label>
            <input
              type="text"
              list="template-categories"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              placeholder="Ex: Inteligência, Memória, Atenção"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <datalist id="template-categories">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <Input
            label="Descrição"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Breve descrição do template (opcional)"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveTemplate(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!canSaveTemplate}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Aplicar intensidade a todas */}
      <Modal
        isOpen={!!applyAllPrompt}
        onClose={() => setApplyAllPrompt(null)}
        title="Aplicar intensidade"
        size="sm"
      >
        {applyAllPrompt && (() => {
          const uniqueColors = [...new Set(applyAllPrompt.otherColors.map(c => c.color))]
          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Existem <strong>{applyAllPrompt.otherColors.length}</strong> {applyAllPrompt.otherColors.length === 1 ? 'cor' : 'cores'} em outras fórmulas com intensidade diferente.
                Deseja aplicar a mesma intensidade ({Math.round(applyAllPrompt.lightness * 100)}%) a todas?
              </p>

              <div className="flex flex-wrap gap-2">
                {uniqueColors.map(color => {
                  const [h, s] = hexToHsl(color)
                  const adjusted = hslToHex(h, s, applyAllPrompt.lightness)
                  return (
                    <div key={color} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                      <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: color }} title={color} />
                      <span className="text-gray-400 text-xs">→</span>
                      <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: adjusted }} title={adjusted} />
                      <span className="text-[10px] font-mono text-gray-400">{adjusted}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setApplyAllPrompt(null)}>
                  Apenas esta
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    applyLightnessToAll(applyAllPrompt.otherColors, applyAllPrompt.lightness)
                    setApplyAllPrompt(null)
                  }}
                >
                  Aplicar a todas
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal: Replicar fórmula */}
      <Modal
        isOpen={!!replicatePrompt}
        onClose={() => setReplicatePrompt(null)}
        title="Replicar fórmula"
        size="sm"
      >
        {replicatePrompt && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Deseja replicar esta fórmula para as demais células?
            </p>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <code className="text-xs text-gray-700 break-all">{replicatePrompt.formula}</code>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setReplicatePrompt(null)}>
                Apenas esta
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleReplicate('row')}>
                Mesma linha →
              </Button>
              <Button size="sm" onClick={() => handleReplicate('column')}>
                Mesma coluna ↓
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Sobrepor fórmulas existentes */}
      <Modal
        isOpen={!!overwritePrompt}
        onClose={() => setOverwritePrompt(null)}
        title="Fórmulas existentes"
        size="sm"
      >
        {overwritePrompt && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {overwritePrompt.conflicts.length} célula(s) já possuem fórmula. Deseja sobrepor?
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {overwritePrompt.conflicts.map((c, i) => {
                const colIdx = data.columns.findIndex(col => col.id === c.colId)
                const rowIdx = data.rows.findIndex(r => r.id === c.rowId)
                const colLetter = colIdx >= 0 ? String.fromCharCode(65 + colIdx) : '?'
                const cellLabel = `${colLetter}${rowIdx + 1}`
                return (
                  <div key={i} className="bg-amber-50 rounded px-2 py-1 text-xs text-amber-800">
                    <span className="font-medium">{cellLabel}:</span>{' '}
                    <code className="break-all">{c.existing}</code>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOverwritePrompt(null)}>
                Cancelar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleOverwriteSkip}>
                Manter existentes
              </Button>
              <Button size="sm" onClick={handleOverwriteAll}>
                Sobrepor
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
