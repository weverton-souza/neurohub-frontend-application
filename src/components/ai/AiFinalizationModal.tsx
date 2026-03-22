import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import AiSparkleIcon from '@/components/ai/AiSparkleIcon'

interface AiFinalizationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function AiFinalizationModal({ isOpen, onClose, onConfirm }: AiFinalizationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar laudo gerado por IA" size="md">
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-lg p-4">
          <AiSparkleIcon size={20} className="text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-800">
              Este laudo contém seções geradas por IA
            </p>
            <p className="text-sm text-violet-700 mt-1">
              Ao finalizar, este laudo será contabilizado na sua franquia mensal de IA.
              Você revisou todo o conteúdo?
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Lembre-se: laudos gerados por IA são ferramentas de apoio. O profissional é responsável pela revisão e validação do conteúdo final.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm}>Finalizar</Button>
        </div>
      </div>
    </Modal>
  )
}
