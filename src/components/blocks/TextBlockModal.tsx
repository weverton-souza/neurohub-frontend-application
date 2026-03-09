import { useMemo } from 'react'
import type { TextBlockData, SlateContent } from '@/types'
import { isSlateContent, htmlToSlateContent } from '@/types'
import PlateEditorComponent, { EMPTY_SLATE_CONTENT } from '@/components/ui/PlateEditor'

interface TextBlockModalProps {
  data: TextBlockData
  onChange: (data: TextBlockData) => void
}

export default function TextBlockModal({ data, onChange }: TextBlockModalProps) {
  // Converter HTML legado para SlateContent se necessário
  const slateContent = useMemo<SlateContent>(() => {
    if (isSlateContent(data.content)) return data.content
    if (typeof data.content === 'string' && data.content) return htmlToSlateContent(data.content)
    return EMPTY_SLATE_CONTENT
  }, [data.content])

  return (
    <PlateEditorComponent
      label="Conteúdo"
      content={slateContent}
      onChange={(value) => onChange({ ...data, content: value })}
      placeholder="Conteúdo da seção..."
    />
  )
}
