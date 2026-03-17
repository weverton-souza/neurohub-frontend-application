import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  message: string
  buttonLabel: string
  onAction: () => void
}

export default function EmptyState({ icon, title, message, buttonLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <Button onClick={onAction} size="lg">
        {buttonLabel}
      </Button>
    </div>
  )
}
