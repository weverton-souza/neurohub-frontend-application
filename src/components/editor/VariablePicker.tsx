import { useState, useRef, useEffect, useCallback } from 'react'
import type { VariableInfo } from '@/types'
import { useClickOutside } from '@/lib/hooks/use-click-outside'

/** @deprecated Use VariableInfo from @/types instead */
export type VariableItem = VariableInfo

interface VariablePickerProps {
  variables: VariableInfo[]
  onInsert: (variableKey: string) => void
  className?: string
}

const SOURCE_LABELS: Record<string, string> = {
  patient: 'Paciente',
  form: 'Formulário',
  backend: 'Sistema',
}

export default function VariablePicker({ variables, onInsert, className = '' }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSearch('')
  }, [])
  useClickOutside(containerRef, handleClose, isOpen)

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen])

  // Group by source
  const grouped = variables.reduce<Record<string, VariableInfo[]>>((acc, v) => {
    if (!acc[v.source]) acc[v.source] = []
    acc[v.source].push(v)
    return acc
  }, {})

  // Filter by search
  const filterItem = (item: VariableInfo) => {
    if (!search) return true
    const q = search.toLowerCase()
    return item.key.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
  }

  const handleSelect = (key: string) => {
    onInsert(key)
    setIsOpen(false)
    setSearch('')
  }

  if (variables.length === 0) return null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Inserir variável"
        className={`
          px-2 py-1 rounded text-sm font-medium transition-colors
          ${isOpen
            ? 'bg-brand-100 text-brand-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
      >
        <span className="font-mono text-xs">{'{x}'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar variável..."
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Variable list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {Object.entries(grouped).map(([source, items]) => {
              const filtered = items.filter(filterItem)
              if (filtered.length === 0) return null

              return (
                <div key={source}>
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-medium uppercase text-gray-400 tracking-wide">
                      {SOURCE_LABELS[source] || source}
                    </span>
                  </div>
                  {filtered.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelect(item.key)}
                      className="w-full text-left px-3 py-1.5 hover:bg-brand-50 transition-colors flex items-center gap-2"
                    >
                      <span className="text-[10px] font-mono text-brand-500 bg-brand-50 px-1 py-0.5 rounded shrink-0">
                        {`{{${item.key}}}`}
                      </span>
                      <span className="text-xs text-gray-600 truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              )
            })}

            {/* No results */}
            {Object.values(grouped).every((items) => items.filter(filterItem).length === 0) && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-400">Nenhuma variável encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
