import type { ScoreTableTemplate } from '@/types'
import { readFromStorage, writeToStorage, deleteFromStorage } from '@/lib/storage-utils'
import { DEFAULT_SCORE_TABLE_TEMPLATES } from '@/lib/default-score-templates'

const STORAGE_KEY = 'neurohub_score_table_templates'

export function getScoreTableTemplates(): ScoreTableTemplate[] {
  const custom = readFromStorage<ScoreTableTemplate>(STORAGE_KEY, [])
  return [...DEFAULT_SCORE_TABLE_TEMPLATES, ...custom]
}

export function getScoreTableTemplate(id: string): ScoreTableTemplate | null {
  // Buscar nos default primeiro
  const defaultTpl = DEFAULT_SCORE_TABLE_TEMPLATES.find(t => t.id === id)
  if (defaultTpl) return defaultTpl

  // Buscar nos custom
  const custom = readFromStorage<ScoreTableTemplate>(STORAGE_KEY, [])
  return custom.find(t => t.id === id) ?? null
}

export function saveScoreTableTemplate(template: ScoreTableTemplate): void {
  const custom = readFromStorage<ScoreTableTemplate>(STORAGE_KEY, [])
  const index = custom.findIndex(t => t.id === template.id)
  if (index >= 0) {
    custom[index] = { ...template, updatedAt: new Date().toISOString() }
  } else {
    custom.push({
      ...template,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  writeToStorage(STORAGE_KEY, custom)
}

export function deleteScoreTableTemplate(id: string): void {
  // Nunca deletar templates default
  if (DEFAULT_SCORE_TABLE_TEMPLATES.some(t => t.id === id)) return
  deleteFromStorage<ScoreTableTemplate>(STORAGE_KEY, (t) => t.id !== id)
}

export function isDefaultScoreTableTemplate(id: string): boolean {
  return DEFAULT_SCORE_TABLE_TEMPLATES.some(t => t.id === id)
}

// Categorias únicas para agrupar no picker
export function getTemplateCategories(): string[] {
  const templates = getScoreTableTemplates()
  const categories = new Set(templates.map(t => t.category))
  return Array.from(categories).sort()
}
