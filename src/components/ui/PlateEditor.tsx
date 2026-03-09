import { useCallback, useEffect, useRef } from 'react'
import { Plate, PlateContent, usePlateEditor, useEditorRef, ParagraphPlugin } from 'platejs/react'
import { BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin } from '@platejs/basic-nodes/react'
import { ListPlugin } from '@platejs/list/react'
import { IndentPlugin } from '@platejs/indent/react'
import { TextAlignPlugin } from '@platejs/basic-styles/react'
import type { Value } from 'platejs'
import type { VariableInfo, SlateContent } from '@/types'
import VariablePicker from '@/components/editor/VariablePicker'

// ========== Types ==========

interface PlateEditorProps {
  content: SlateContent
  onChange: (value: SlateContent) => void
  label?: string
  placeholder?: string
  variables?: VariableInfo[]
}

// ========== Default value ==========

export const EMPTY_SLATE_CONTENT: SlateContent = [
  { type: 'p', children: [{ text: '' }] },
]

// ========== Toolbar Button ==========

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`
        px-2 py-1 rounded text-sm font-medium transition-colors
        ${active
          ? 'bg-brand-100 text-brand-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-gray-300 mx-1" />
}

// ========== Toolbar (must be inside <Plate> to access editor) ==========

function EditorToolbar({
  variables,
  onInsertVariable,
}: {
  variables?: VariableInfo[]
  onInsertVariable: (key: string) => void
}) {
  const editor = useEditorRef()

  const isMark = (mark: string) => {
    try {
      return editor.api.isMarkActive(mark)
    } catch {
      return false
    }
  }

  const getAlign = () => {
    try {
      const entries = Array.from(editor.api.nodes({ match: { type: 'p' } })) as [Record<string, unknown>, unknown][]
      if (entries.length === 0) return 'left'
      const node = entries[0][0]
      return (node.align as string) ?? 'left'
    } catch {
      return 'left'
    }
  }

  const isList = (type: string) => {
    try {
      const entries = Array.from(editor.api.nodes({ match: (n: Record<string, unknown>) => n.listStyleType === type }))
      return entries.length > 0
    } catch {
      return false
    }
  }

  const align = getAlign()

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
      {/* Marcas de texto */}
      <ToolbarButton
        active={isMark('bold')}
        onClick={() => editor.tf.bold.toggle()}
        title="Negrito (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        active={isMark('italic')}
        onClick={() => editor.tf.italic.toggle()}
        title="Itálico (Ctrl+I)"
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        active={isMark('underline')}
        onClick={() => editor.tf.underline.toggle()}
        title="Sublinhado (Ctrl+U)"
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        active={isMark('strikethrough')}
        onClick={() => editor.tf.strikethrough.toggle()}
        title="Riscado (Ctrl+Shift+X)"
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Listas */}
      <ToolbarButton
        active={isList('disc')}
        onClick={() => editor.tf.list.toggle({ listStyleType: 'disc' })}
        title="Lista com marcadores"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={isList('decimal')}
        onClick={() => editor.tf.list.toggle({ listStyleType: 'decimal' })}
        title="Lista numerada"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
          <text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
          <text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
          <text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alinhamento */}
      <ToolbarButton
        active={align === 'left'}
        onClick={() => editor.tf.textAlign.setNodes({ align: 'left' })}
        title="Alinhar à esquerda"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="10" x2="15" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="18" x2="15" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={align === 'center'}
        onClick={() => editor.tf.textAlign.setNodes({ align: 'center' })}
        title="Centralizar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="10" x2="18" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" /><line x1="6" y1="18" x2="18" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={align === 'right'}
        onClick={() => editor.tf.textAlign.setNodes({ align: 'right' })}
        title="Alinhar à direita"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="10" x2="21" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" /><line x1="9" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        active={align === 'justify'}
        onClick={() => editor.tf.textAlign.setNodes({ align: 'justify' })}
        title="Justificar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      {/* Variable picker */}
      {variables && variables.length > 0 && (
        <>
          <ToolbarDivider />
          <VariablePicker
            variables={variables}
            onInsert={onInsertVariable}
          />
        </>
      )}
    </div>
  )
}

// ========== Main Component ==========

export default function PlateEditorComponent({
  content,
  onChange,
  label,
  placeholder = '',
  variables,
}: PlateEditorProps) {
  const initialValueRef = useRef(content as Value)
  const isExternalUpdate = useRef(false)

  const editor = usePlateEditor({
    plugins: [
      ParagraphPlugin,
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin.configure({
        shortcuts: { toggle: { keys: 'mod+shift+x' } },
      }),
      IndentPlugin.configure({
        inject: {
          targetPlugins: [ParagraphPlugin.key],
        },
      }),
      ListPlugin,
      TextAlignPlugin.configure({
        inject: {
          targetPlugins: [ParagraphPlugin.key],
        },
      }),
    ],
    value: initialValueRef.current,
  })

  // Sync external content changes (e.g. undo, load from storage)
  useEffect(() => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false
      return
    }
    const currentJson = JSON.stringify(editor.children)
    const newJson = JSON.stringify(content)
    if (currentJson !== newJson && content) {
      editor.tf.setValue(content as Value)
    }
  }, [content, editor])

  const handleChange = useCallback(({ value }: { value: Value }) => {
    isExternalUpdate.current = true
    onChange(value as SlateContent)
  }, [onChange])

  const handleInsertVariable = useCallback((variableKey: string) => {
    editor.tf.insertText(`{{${variableKey}}}`)
  }, [editor])

  const labelId = label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div>
      {label && (
        <label
          htmlFor={labelId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}

      <div className="rounded-lg border border-gray-300 overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-colors">
        <Plate editor={editor} onChange={handleChange}>
          <EditorToolbar
            variables={variables}
            onInsertVariable={handleInsertVariable}
          />
          <PlateContent
            className="plate-editor px-3 py-2 text-sm min-h-[80px] text-gray-900 outline-none"
            placeholder={placeholder}
          />
        </Plate>
      </div>
    </div>
  )
}
