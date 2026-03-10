import { useState } from 'react'
import type { ReportVersion } from '@/types'
import { formatDateTime } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  versions: ReportVersion[]
  onRestore: (version: ReportVersion) => void
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  onRestore,
}: VersionHistoryModalProps) {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  const handleRestore = (version: ReportVersion) => {
    onRestore(version)
    setConfirmRestoreId(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmRestoreId(null)
        onClose()
      }}
      title="Histórico de Versões"
      size="md"
    >
      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 7v5l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Nenhuma versão salva ainda</p>
            <p className="text-xs text-gray-400 mt-1">
              Versões são criadas ao mudar status, exportar ou salvar manualmente
            </p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{version.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(version.createdAt)}
                    </span>
                    <StatusBadge status={version.status} />
                  </div>
                  {version.customerName && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      Cliente: {version.customerName}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {version.blocks.length} {version.blocks.length === 1 ? 'bloco' : 'blocos'}
                  </p>
                </div>

                <div className="shrink-0">
                  {confirmRestoreId === version.id ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRestoreId(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRestore(version)}
                      >
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmRestoreId(version.id)}
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
