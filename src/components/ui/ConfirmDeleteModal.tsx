import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, message }: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar exclusão" size="sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
