import { useState, useMemo } from 'react'
import type { ScoreTableTemplate } from '@/types'
import { getScoreTableTemplates } from '@/lib/score-table-template-service'

interface ScoreTableTemplatePickerProps {
  onSelectTemplate: (templateId: string) => void
  onSelectEmpty: () => void
  onBack: () => void
}

export default function ScoreTableTemplatePicker({
  onSelectTemplate,
  onSelectEmpty,
  onBack,
}: ScoreTableTemplatePickerProps) {
  const [search, setSearch] = useState('')

  const templates = useMemo(() => getScoreTableTemplates(), [])

  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.instrumentName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [templates, search])

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const map = new Map<string, ScoreTableTemplate[]>()
    for (const t of filtered) {
      const arr = map.get(t.category) ?? []
      arr.push(t)
      map.set(t.category, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  return (
    <div className="p-4 space-y-4">
      {/* Header com voltar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Voltar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="text-sm font-medium text-gray-700">Escolha um template de tabela</p>
      </div>

      {/* Busca */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        placeholder="Buscar por instrumento..."
      />

      {/* Opção: Tabela Vazia */}
      <button
        type="button"
        onClick={onSelectEmpty}
        className="w-full flex items-start gap-3 p-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-300 hover:bg-brand-50/30 transition-all text-left"
      >
        <div className="p-2 rounded-lg bg-gray-100 text-gray-500 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">Tabela Vazia</p>
          <p className="text-xs text-gray-500 mt-0.5">Criar tabela em branco sem template</p>
        </div>
      </button>

      {/* Templates agrupados por categoria */}
      {grouped.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhum template encontrado.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, tpls]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {category}
              </p>
              <div className="space-y-2">
                {tpls.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelectTemplate(tpl.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left group"
                  >
                    <div className="p-2 rounded-lg bg-brand-100 text-brand-600 shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm group-hover:text-brand-700">
                          {tpl.name}
                        </p>
                        {tpl.isDefault && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-brand-100 text-brand-700 rounded">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {tpl.columns.length} colunas · {tpl.rows.length} linhas
                        {tpl.columns.some(c => c.formula) && ' · com fórmulas'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
