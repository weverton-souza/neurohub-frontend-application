import { useRef } from 'react'
import type { InfoBoxData, VariableInfo } from '@/types'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import VariablePicker from '@/components/editor/VariablePicker'

interface InfoBoxBlockProps {
  data: InfoBoxData
  onChange: (data: InfoBoxData) => void
  variables?: VariableInfo[]
}

export default function InfoBoxBlock({ data, onChange, variables }: InfoBoxBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertVariable = (key: string) => {
    const el = textareaRef.current
    if (!el) {
      // Fallback: append
      onChange({ ...data, content: data.content + `{{${key}}}` })
      return
    }

    const start = el.selectionStart
    const end = el.selectionEnd
    const before = data.content.slice(0, start)
    const after = data.content.slice(end)
    const insertion = `{{${key}}}`
    const newContent = before + insertion + after
    onChange({ ...data, content: newContent })

    // Restore cursor after insertion
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + insertion.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="space-y-4">
      <Input
        label="Label"
        value={data.label}
        onChange={(e) => onChange({ ...data, label: e.target.value })}
        placeholder="Label (ex: Impressão Diagnóstica)"
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Conteúdo</label>
          {variables && variables.length > 0 && (
            <VariablePicker
              variables={variables}
              onInsert={handleInsertVariable}
            />
          )}
        </div>
        <TextArea
          ref={textareaRef}
          value={data.content}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
          placeholder="Conteúdo..."
        />
      </div>

      {/* Preview */}
      {(data.label || data.content) && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Pré-visualização
          </p>
          <div className="border-l-4 border-brand-500 bg-brand-50 rounded-r-lg p-4">
            {data.label && (
              <p className="font-semibold text-brand-700 text-sm mb-1">
                {data.label}
              </p>
            )}
            {data.content && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {data.content}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
