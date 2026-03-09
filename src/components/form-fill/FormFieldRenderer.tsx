import type { FormField, FormFieldAnswer } from '@/types'

interface FormFieldRendererProps {
  field: FormField
  answer: FormFieldAnswer
  onChange: (answer: FormFieldAnswer) => void
}

export default function FormFieldRenderer({ field, answer, onChange }: FormFieldRendererProps) {
  const update = (patch: Partial<FormFieldAnswer>) => {
    onChange({ ...answer, ...patch })
  }

  switch (field.type) {
    case 'short-text':
      return (
        <input
          type="text"
          value={answer.value}
          onChange={(e) => update({ value: e.target.value })}
          placeholder={field.placeholder || 'Sua resposta'}
          className="w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-0 focus:outline-none transition-colors"
        />
      )

    case 'long-text':
      return (
        <textarea
          value={answer.value}
          onChange={(e) => update({ value: e.target.value })}
          placeholder={field.placeholder || 'Sua resposta'}
          rows={3}
          className="w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-0 focus:outline-none transition-colors resize-none"
        />
      )

    case 'single-choice':
      return (
        <div className="space-y-1">
          {field.options.map((opt) => {
            const isSelected = answer.selectedOptionIds.includes(opt.id)
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-brand-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-brand-500' : 'border-gray-400'
                }`}>
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                </span>
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  checked={isSelected}
                  onChange={() => update({ selectedOptionIds: [opt.id] })}
                  className="sr-only"
                />
                <span className="text-sm text-gray-700">{opt.label || 'Opção'}</span>
              </label>
            )
          })}
        </div>
      )

    case 'multiple-choice':
      return (
        <div className="space-y-1">
          {field.options.map((opt) => {
            const isChecked = answer.selectedOptionIds.includes(opt.id)
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-brand-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                  isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-400'
                }`}>
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const ids = isChecked
                      ? answer.selectedOptionIds.filter((id) => id !== opt.id)
                      : [...answer.selectedOptionIds, opt.id]
                    update({ selectedOptionIds: ids })
                  }}
                  className="sr-only"
                />
                <span className="text-sm text-gray-700">{opt.label || 'Opção'}</span>
              </label>
            )
          })}
        </div>
      )

    case 'scale': {
      const values = Array.from(
        { length: field.scaleMax - field.scaleMin + 1 },
        (_, i) => field.scaleMin + i
      )
      return (
        <div className="flex items-center gap-3 flex-wrap">
          {field.scaleMinLabel && (
            <span className="text-xs text-gray-400 shrink-0">{field.scaleMinLabel}</span>
          )}
          <div className="flex items-center gap-1.5">
            {values.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => update({ scaleValue: val })}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                  answer.scaleValue === val
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-brand-50 hover:text-brand-600'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {field.scaleMaxLabel && (
            <span className="text-xs text-gray-400 shrink-0">{field.scaleMaxLabel}</span>
          )}
        </div>
      )
    }

    case 'yes-no':
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update({ value: 'sim' })}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              answer.value === 'sim'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600'
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => update({ value: 'não' })}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              answer.value === 'não'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600'
            }`}
          >
            Não
          </button>
        </div>
      )

    case 'date':
      return (
        <input
          type="date"
          value={answer.value}
          onChange={(e) => update({ value: e.target.value })}
          className="border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-0 focus:outline-none transition-colors"
        />
      )

    default:
      return null
  }
}
