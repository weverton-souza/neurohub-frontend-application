import { useState, useRef, useCallback } from 'react'
import type { ReportStatus } from '@/types'
import {
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  REPORT_STATUS_TRANSITIONS,
} from '@/types'
import { useClickOutside } from '@/lib/hooks/use-click-outside'

interface StatusSelectorProps {
  status: ReportStatus
  onChange: (newStatus: ReportStatus) => void
}

export default function StatusSelector({ status, onChange }: StatusSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const transitions = REPORT_STATUS_TRANSITIONS[status]
  const { bg, text } = REPORT_STATUS_COLORS[status]

  const closeDropdown = useCallback(() => setOpen(false), [])
  useClickOutside(ref, closeDropdown, open)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${bg} ${text} hover:opacity-80`}
      >
        {REPORT_STATUS_LABELS[status]}
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && transitions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
          {transitions.map((target) => {
            const targetColors = REPORT_STATUS_COLORS[target]
            return (
              <button
                key={target}
                type="button"
                onClick={() => {
                  onChange(target)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <span className={`w-2 h-2 rounded-full ${targetColors.bg.replace('100', '500').replace('bg-', 'bg-')}`}
                  style={{
                    backgroundColor:
                      target === 'rascunho' ? '#eab308' :
                      target === 'em_revisao' ? '#3b82f6' :
                      '#22c55e',
                  }}
                />
                {REPORT_STATUS_LABELS[target]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
