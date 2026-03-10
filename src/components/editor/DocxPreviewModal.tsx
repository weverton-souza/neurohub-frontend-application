import { useState, useEffect, useCallback, useRef } from 'react'
import type { Report } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { renderAsync } from 'docx-preview'
import { generateDocx } from '@/lib/docx-generator'
import { saveAs } from 'file-saver'

interface DocxPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  report: Report
}

type PreviewState = 'loading' | 'ready' | 'error'

export default function DocxPreviewModal({ isOpen, onClose, report }: DocxPreviewModalProps) {
  const [state, setState] = useState<PreviewState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const docxBlobRef = useRef<Blob | null>(null)

  const loadPreview = useCallback(async () => {
    setState('loading')
    setErrorMessage('')
    docxBlobRef.current = null

    try {
      const blob = await generateDocx(report)
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
  }, [report])

  useEffect(() => {
    if (isOpen) {
      loadPreview()
    }

    return () => {
      docxBlobRef.current = null
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [isOpen])

  const handleDownloadDocx = useCallback(() => {
    const blob = docxBlobRef.current
    if (!blob) return
    const name = report.customerName?.trim() || new Date().toISOString().split('T')[0]
    saveAs(blob, `Laudo - ${name}.docx`)
  }, [report.customerName])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preview do Documento" size="2xl">
      <div className="flex flex-col h-[80vh]">
        {state === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500">Renderizando documento...</span>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
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
              <Button variant="secondary" size="sm" onClick={loadPreview}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-100 ${state !== 'ready' ? 'hidden' : ''}`}
        />

        {state === 'ready' && (
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownloadDocx}>
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Baixar DOCX
              </span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
