import type { ChartTemplate } from '@/types'
import { readFromStorage, writeToStorage, deleteFromStorage } from '@/lib/storage-utils'
import { DEFAULT_CHART_TEMPLATES } from '@/lib/default-chart-templates'

const STORAGE_KEY = 'neurohub_chart_templates'

export function getChartTemplates(): ChartTemplate[] {
  const custom = readFromStorage<ChartTemplate>(STORAGE_KEY, [])
  return [...DEFAULT_CHART_TEMPLATES, ...custom]
}

export function getChartTemplate(id: string): ChartTemplate | null {
  const defaultTpl = DEFAULT_CHART_TEMPLATES.find(t => t.id === id)
  if (defaultTpl) return defaultTpl

  const custom = readFromStorage<ChartTemplate>(STORAGE_KEY, [])
  return custom.find(t => t.id === id) ?? null
}

export function saveChartTemplate(template: ChartTemplate): void {
  const custom = readFromStorage<ChartTemplate>(STORAGE_KEY, [])
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

export function deleteChartTemplate(id: string): void {
  if (DEFAULT_CHART_TEMPLATES.some(t => t.id === id)) return
  deleteFromStorage<ChartTemplate>(STORAGE_KEY, (t) => t.id !== id)
}

export function isDefaultChartTemplate(id: string): boolean {
  return DEFAULT_CHART_TEMPLATES.some(t => t.id === id)
}

export function getChartTemplateCategories(): string[] {
  const templates = getChartTemplates()
  const categories = new Set(templates.map(t => t.category))
  return Array.from(categories).sort()
}
