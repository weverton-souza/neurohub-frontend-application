import type { LabeledItem } from '@/types'
import Input from '@/components/ui/Input'
import TextArea from '@/components/ui/TextArea'
import Button from '@/components/ui/Button'
import { CloseIcon } from '@/components/icons'

interface LabeledItemsListProps {
  items: LabeledItem[]
  onAdd: () => void
  onUpdate: (index: number, field: keyof LabeledItem, value: string) => void
  onRemove: (index: number) => void
}

export default function LabeledItemsList({ items, onAdd, onUpdate, onRemove }: LabeledItemsListProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id ?? index} className="flex items-start gap-3">
          <div className="w-1/3">
            <Input
              value={item.label}
              onChange={(e) => onUpdate(index, 'label', e.target.value)}
              placeholder="Label (ex: Assistência)"
            />
          </div>
          <div className="flex-1">
            <TextArea
              value={item.text}
              onChange={(e) => onUpdate(index, 'text', e.target.value)}
              placeholder="Descrição..."
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="mt-1 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
            title="Remover item"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={onAdd}>
        + Adicionar item
      </Button>
    </div>
  )
}
