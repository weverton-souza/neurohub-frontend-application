import { readFromStorage, writeToStorage, deleteFromStorage } from '@/lib/storage-utils'

interface BaseTemplate {
  id: string
  category: string
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

export function createTemplateService<T extends BaseTemplate>(
  defaults: T[],
  storageKey: string
) {
  function getAll(): T[] {
    const custom = readFromStorage<T>(storageKey, [])
    return [...defaults, ...custom]
  }

  function getById(id: string): T | null {
    const defaultTpl = defaults.find(t => t.id === id)
    if (defaultTpl) return defaultTpl
    const custom = readFromStorage<T>(storageKey, [])
    return custom.find(t => t.id === id) ?? null
  }

  function save(template: T): void {
    const custom = readFromStorage<T>(storageKey, [])
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
    writeToStorage(storageKey, custom)
  }

  function remove(id: string): void {
    if (defaults.some(t => t.id === id)) return
    deleteFromStorage<T>(storageKey, (t) => t.id !== id)
  }

  function isDefault(id: string): boolean {
    return defaults.some(t => t.id === id)
  }

  function getCategories(): string[] {
    const templates = getAll()
    const categories = new Set(templates.map(t => t.category))
    return Array.from(categories).sort()
  }

  return { getAll, getById, save, remove, isDefault, getCategories }
}
