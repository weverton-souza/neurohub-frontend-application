import { useCallback, useMemo } from 'react'
import { TextBlockData, SlateContent, isSlateContent, htmlToSlateContent } from '@/types'
import Input from '@/components/ui/Input'
import PlateEditorComponent, { EMPTY_SLATE_CONTENT } from '@/components/ui/PlateEditor'

interface TextBlockProps {
  data: TextBlockData
  onChange: (data: TextBlockData) => void
}

export default function TextBlock({ data, onChange }: TextBlockProps) {
  const updateField = useCallback(
    (field: keyof TextBlockData, value: string | boolean | SlateContent) => {
      onChange({ ...data, [field]: value })
    },
    [data, onChange]
  )

  // Converter HTML legado para SlateContent se necessário
  const slateContent = useMemo<SlateContent>(() => {
    if (isSlateContent(data.content)) return data.content
    if (typeof data.content === 'string' && data.content) return htmlToSlateContent(data.content)
    return EMPTY_SLATE_CONTENT
  }, [data.content])

  // Regra de negócio: cada bloco de texto tem um único papel
  const blockRole = data.title ? 'section' : data.subtitle ? 'subsection' : 'content'

  return (
    <div className="space-y-4">
      {/* Seção → apenas título */}
      {blockRole === 'section' && (
        <Input
          label="Título da seção"
          value={data.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Título da seção"
        />
      )}

      {/* Subseção → apenas subtítulo */}
      {blockRole === 'subsection' && (
        <Input
          label="Subtítulo"
          value={data.subtitle}
          onChange={(e) => updateField('subtitle', e.target.value)}
          placeholder="Subtítulo"
        />
      )}

      {/* Conteúdo → editor Plate (sem título nem subtítulo) */}
      {blockRole === 'content' && (
        <PlateEditorComponent
          label="Conteúdo"
          content={slateContent}
          onChange={(value) => updateField('content', value)}
          placeholder="Conteúdo da seção..."
        />
      )}
    </div>
  )
}
