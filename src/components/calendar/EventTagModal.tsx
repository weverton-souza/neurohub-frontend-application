import { useState, useEffect } from 'react'
import type { EventTag } from '@/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ColorPicker, { COLOR_PRESETS } from '@/components/ui/ColorPicker'

interface EventTagModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (tag: { name: string; color: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  tag?: EventTag | null
  existingColors: string[]
}

function getNextAvailableColor(existingColors: string[]): string {
  const usedSet = new Set(existingColors.map((c) => c.toUpperCase()))
  for (const preset of COLOR_PRESETS) {
    if (!usedSet.has(preset.toUpperCase())) return preset
  }
  return COLOR_PRESETS[0]
}

export default function EventTagModal({ isOpen, onClose, onSave, onDelete, tag, existingColors }: EventTagModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name)
        setColor(tag.color)
      } else {
        setName('')
        setColor(getNextAvailableColor(existingColors))
      }
    }
  }, [isOpen, tag, existingColors])

  const handleSave = async () => {
    if (!name.trim() || !color.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!tag || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(tag.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tag ? 'Editar Tag' : 'Nova Tag'}
      size="sm"
      footer={
        <div className="flex items-center justify-between">
          <div>
            {tag && onDelete && (
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da tag"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Consulta inicial"
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
          <div className="flex items-center gap-3">
            <ColorPicker value={color} onChange={setColor} />
            <span className="text-sm text-gray-500">{color}</span>
          </div>
        </div>

        {color && name.trim() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pré-visualização</label>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 bg-white">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              {name.trim()}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
