import type { EventTag } from '@/types'

interface TagPickerProps {
  tags: EventTag[]
  selectedId?: string
  onChange: (id: string) => void
  onNewTag?: () => void
}

export default function TagPicker({ tags, selectedId, onChange, onNewTag }: TagPickerProps) {
  const selectedTag = tags.find((t) => t.id === selectedId)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(tag.id === selectedId ? '' : tag.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                selectedId === tag.id
                  ? 'border-gray-400 bg-white text-gray-800 shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>
        {onNewTag && (
          <button
            type="button"
            onClick={onNewTag}
            className="shrink-0 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            + Nova tag
          </button>
        )}
      </div>
      {selectedTag && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: selectedTag.color }} />
          <span className="text-xs text-gray-500">{selectedTag.name}</span>
        </div>
      )}
    </div>
  )
}
