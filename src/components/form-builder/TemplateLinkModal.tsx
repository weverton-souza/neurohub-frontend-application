import type { LaudoTemplate } from '@/types'
import { getBlockTitle } from '@/lib/block-constants'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface TemplateLinkModalProps {
  isOpen: boolean
  onClose: () => void
  templates: LaudoTemplate[]
  currentTemplateId: string | null
  onSelect: (templateId: string | null) => void
}

export default function TemplateLinkModal({
  isOpen,
  onClose,
  templates,
  currentTemplateId,
  onSelect,
}: TemplateLinkModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vincular Template de Laudo" size="lg">
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-500">
          Selecione o template de laudo que será preenchido automaticamente pela IA com base nas respostas deste formulário.
        </p>

        {/* Desvincular */}
        {currentTemplateId && (
          <button
            type="button"
            onClick={() => { onSelect(null); onClose() }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-300 hover:bg-red-50/50 transition-all text-left"
          >
            <div className="p-3 rounded-lg bg-gray-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Desvincular template</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Remover a associação com template de laudo
              </p>
            </div>
          </button>
        )}

        {/* Templates */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {templates.map((template) => {
            const isSelected = template.id === currentTemplateId
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => { onSelect(template.id); onClose() }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                    : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-brand-200' : 'bg-brand-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{template.name}</p>
                      {isSelected && (
                        <span className="text-[10px] font-medium uppercase bg-brand-200 text-brand-700 px-1.5 py-0.5 rounded">
                          Atual
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {template.blocks.length} blocos
                  </span>
                </div>

                {/* Block summary */}
                <div className="mt-2 flex flex-wrap gap-1 pl-12">
                  {template.blocks.map((block, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                    >
                      {getBlockTitle(block)}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}
