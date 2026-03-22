import type { ScoreTableColumn, ScoreTableData } from '@/types'
import { isFormula, evaluateText, evaluateTextWithColor, FORMULA_FUNCTIONS } from './formula-parser'

export { isFormula }

export interface FormulaResult {
  text: string
  bgColor?: string
  textColor?: string
}

function deriveTextColor(bgHex: string): string {
  const r = parseInt(bgHex.slice(1, 3), 16)
  const g = parseInt(bgHex.slice(3, 5), 16)
  const b = parseInt(bgHex.slice(5, 7), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 186 ? '#1a1a1a' : '#ffffff'
}

export function isFormulaColumn(column: ScoreTableColumn): boolean {
  return column.formula != null
}

export function computeCellDisplayValue(
  data: ScoreTableData,
  rowId: string,
  colId: string,
): string {
  const row = data.rows.find(r => r.id === rowId)
  if (!row) return ''

  const rawValue = row.values[colId] ?? ''

  if (isFormula(rawValue)) {
    return evaluateText(rawValue, rowId, data, 0)
  }

  const col = data.columns.find(c => c.id === colId)
  if (col?.formula && rawValue === '') {
    return evaluateText(col.formula, rowId, data, 0)
  }

  return rawValue
}

export function computeCellResult(
  data: ScoreTableData,
  rowId: string,
  colId: string,
): FormulaResult {
  const row = data.rows.find(r => r.id === rowId)
  if (!row) return { text: '' }

  const rawValue = row.values[colId] ?? ''
  const col = data.columns.find(c => c.id === colId)

  const formulaSource = isFormula(rawValue)
    ? rawValue
    : (rawValue === '' && col?.formula)
      ? col.formula
      : null

  if (!formulaSource) return { text: rawValue }

  const result = evaluateTextWithColor(formulaSource, rowId, data, 0)
  if (result.bgColor) {
    return { text: result.text, bgColor: result.bgColor, textColor: deriveTextColor(result.bgColor) }
  }
  return { text: result.text }
}

export function cellHasFormula(
  data: ScoreTableData,
  rowId: string,
  colId: string,
): boolean {
  const row = data.rows.find(r => r.id === rowId)
  if (!row) return false

  const rawValue = row.values[colId] ?? ''

  if (isFormula(rawValue)) return true

  const col = data.columns.find(c => c.id === colId)
  if (col?.formula && rawValue === '') return true

  return false
}

export function getCellFormulaText(
  data: ScoreTableData,
  rowId: string,
  colId: string,
): string {
  const row = data.rows.find(r => r.id === rowId)
  if (!row) return ''

  const rawValue = row.values[colId] ?? ''

  if (isFormula(rawValue)) return rawValue

  const col = data.columns.find(c => c.id === colId)
  if (col?.formula && rawValue === '') return col.formula

  return rawValue
}

export function getFormulaFunctions(): readonly string[] {
  return FORMULA_FUNCTIONS
}
