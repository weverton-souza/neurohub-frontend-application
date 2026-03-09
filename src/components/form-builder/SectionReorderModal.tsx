import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'

interface SectionItem {
  id: string
  title: string
  childCount: number
}

interface SectionReorderModalProps {
  isOpen: boolean
  onClose: () => void
  sections: SectionItem[]
  onReorder: (orderedSectionIds: string[]) => void
}

export default function SectionReorderModal({
  isOpen,
  onClose,
  sections: initialSections,
  onReorder,
}: SectionReorderModalProps) {
  const [sections, setSections] = useState<SectionItem[]>(initialSections)

  // Reset when modal opens with new sections
  useEffect(() => {
    if (isOpen) {
      setSections(initialSections)
    }
  }, [isOpen, initialSections])

  const moveUp = (index: number) => {
    if (index <= 0) return
    const next = [...sections]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setSections(next)
  }

  const moveDown = (index: number) => {
    if (index >= sections.length - 1) return
    const next = [...sections]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setSections(next)
  }

  const handleSave = () => {
    onReorder(sections.map((s) => s.id))
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reorganizar seções" size="sm">
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          As perguntas de cada seção serão movidas junto com ela.
        </p>

        <div className="space-y-1">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="flex items-center gap-3 px-3 py-3 bg-white border border-gray-200 rounded-lg"
            >
              {/* Drag dots (visual only) */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-gray-300 shrink-0">
                <circle cx="4" cy="2" r="1.2" />
                <circle cx="10" cy="2" r="1.2" />
                <circle cx="4" cy="7" r="1.2" />
                <circle cx="10" cy="7" r="1.2" />
                <circle cx="4" cy="12" r="1.2" />
                <circle cx="10" cy="12" r="1.2" />
              </svg>

              {/* Section info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {section.title || 'Seção sem título'}
                </p>
                <p className="text-xs text-gray-400">
                  Seção {index + 1} de {sections.length}
                  {section.childCount > 0 && ` · ${section.childCount} pergunta${section.childCount > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Up/Down arrows */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Mover para cima"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === sections.length - 1}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Mover para baixo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}
