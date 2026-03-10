import { useState, useEffect, useCallback, useRef } from 'react'
import type { Report } from '@/types'
import { renderAsync } from 'docx-preview'
import { generateDocx } from '@/lib/docx-generator'
import { saveAs } from 'file-saver'

interface DocxPreviewPanelProps {
  report: Report
  onClose: () => void
  refreshKey: number
}

type PreviewState = 'loading' | 'ready' | 'error'

export default function DocxPreviewPanel({ report, onClose, refreshKey }: DocxPreviewPanelProps) {
  const [state, setState] = useState<PreviewState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const docxBlobRef = useRef<Blob | null>(null)
  const reportRef = useRef(report)
  reportRef.current = report

  const loadPreview = useCallback(async () => {
    setState('loading')
    setErrorMessage('')
    docxBlobRef.current = null

    try {
      const blob = await generateDocx(reportRef.current)
      docxBlobRef.current = blob

      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        await renderAsync(await blob.arrayBuffer(), containerRef.current, undefined, {
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
        })
      }

      setState('ready')
    } catch (err: unknown) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao renderizar documento')
    }
  }, [])

  useEffect(() => {
    loadPreview()
  }, [refreshKey, loadPreview])

  useEffect(() => {
    return () => {
      docxBlobRef.current = null
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  const handleDownloadDocx = useCallback(() => {
    const blob = docxBlobRef.current
    if (!blob) return
    const name = reportRef.current.customerName?.trim() || new Date().toISOString().split('T')[0]
    saveAs(blob, `Laudo - ${name}.docx`)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500">Renderizando...</span>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <div className="p-3 rounded-full bg-red-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Erro ao renderizar</p>
                <p className="text-xs text-gray-500 mt-1">{errorMessage}</p>
              </div>
              <button
                onClick={loadPreview}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`h-full overflow-auto bg-transparent docx-preview-panel ${state !== 'ready' ? 'invisible' : ''}`}
        />
        <style>{`.docx-preview-panel .docx-wrapper { background: transparent !important; }`}</style>
      </div>
    </div>
  )
}
