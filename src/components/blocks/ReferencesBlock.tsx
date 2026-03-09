import { useCallback, useRef } from 'react'
import type { ReferencesData } from '@/types'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import { CloseIcon } from '@/components/icons'

interface ReferencesBlockProps {
  data: ReferencesData
  onChange: (data: ReferencesData) => void
}

export default function ReferencesBlock({ data, onChange }: ReferencesBlockProps) {
  const keyCounterRef = useRef(0)
  const keysRef = useRef<string[]>(
    data.references.map(() => `ref-${keyCounterRef.current++}`)
  )

  // Keep keys in sync with references length
  while (keysRef.current.length < data.references.length) {
    keysRef.current.push(`ref-${keyCounterRef.current++}`)
  }

  const addReference = useCallback(() => {
    keysRef.current.push(`ref-${keyCounterRef.current++}`)
    onChange({ ...data, references: [...data.references, ''] })
  }, [data, onChange])

  const updateReference = useCallback(
    (index: number, value: string) => {
      const refs = [...data.references]
      refs[index] = value
      onChange({ ...data, references: refs })
    },
    [data, onChange]
  )

  const removeReference = useCallback(
    (index: number) => {
      keysRef.current.splice(index, 1)
      onChange({ ...data, references: data.references.filter((_, i) => i !== index) })
    },
    [data, onChange]
  )

  return (
    <div className="space-y-4">
      <Input
        label="Título da seção"
        value={data.title}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        placeholder="REFERÊNCIAS BIBLIOGRÁFICAS"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Referências
        </label>
        <div className="space-y-2">
          {data.references.map((ref, index) => (
            <div key={keysRef.current[index]} className="flex gap-2">
              <div className="flex-1">
                <TextArea
                  value={ref}
                  onChange={(e) => updateReference(index, e.target.value)}
                  placeholder="SOBRENOME, Nome. Título da obra. Edição. Local: Editora, Ano."
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => removeReference(index)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                title="Remover referência"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addReference}
          className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium py-1 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar referência
        </button>
      </div>

      <p className="text-xs text-gray-400 italic">
        Formato ABNT: recuo deslocado e alinhamento à esquerda serão aplicados automaticamente no documento exportado.
      </p>
    </div>
  )
}
