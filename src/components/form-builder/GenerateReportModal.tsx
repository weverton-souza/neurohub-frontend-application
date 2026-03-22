import { useState } from 'react'
import type { Form, FormResponse, ReportTemplate, Block, TextBlockData, InfoBoxData } from '@/types'
import { generateSection } from '@/lib/api/ai-api'
import { createReport } from '@/lib/api/report-api'
import { getCustomer } from '@/lib/api/customer-api'
import { updateFormResponse } from '@/lib/api/form-api'
import { buildVariableMap, resolveBlockVariables } from '@/lib/variable-service'
import { getBlockTitle } from '@/lib/block-constants'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  form: Form | null
  response: FormResponse | null
  template: ReportTemplate | null
  onReportGenerated: (reportId: string) => void
}

type GenerationState = 'confirm' | 'loading' | 'error' | 'no-template'

export default function GenerateReportModal({
  isOpen,
  onClose,
  form,
  response,
  template,
  onReportGenerated,
}: GenerateReportModalProps) {
  const [state, setState] = useState<GenerationState>('confirm')
  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0, sectionName: '' })

  const handleGenerate = async () => {
    if (!form || !response || !template) return

    setState('loading')
    setErrorMessage('')

    try {
      // 1. Criar relatório vazio (rascunho) a partir do template
      const blocks: Block[] = template.blocks.map((tb, i) => ({
        id: crypto.randomUUID(),
        type: tb.type,
        order: i,
        data: structuredClone(tb.data),
        collapsed: false,
      }))

      // Resolve template variables
      let customerData = null
      if (response.customerId) {
        try {
          const customer = await getCustomer(response.customerId)
          customerData = customer?.data ?? null
        } catch {
          // customer not found
        }
      }
      const variableMap = buildVariableMap(customerData, form, response)
      const resolvedBlocks = resolveBlockVariables(blocks, variableMap)

      const report = await createReport({
        status: 'rascunho',
        customerName: response.customerName,
        customerId: response.customerId ?? undefined,
        formResponseId: response.id,
        formId: form.id,
        blocks: resolvedBlocks,
      })

      // 2. Gerar texto seção a seção via backend IA
      const aiEligibleBlocks = resolvedBlocks.filter(
        (b) => b.type === 'text' || b.type === 'info-box',
      )
      setProgress({ current: 0, total: aiEligibleBlocks.length, sectionName: '' })

      for (let i = 0; i < aiEligibleBlocks.length; i++) {
        const block = aiEligibleBlocks[i]
        const sectionType = getBlockTitle(block)
        setProgress({ current: i + 1, total: aiEligibleBlocks.length, sectionName: sectionType })

        try {
          const result = await generateSection(report.id, {
            sectionType,
            formResponseId: response.id,
            customerId: response.customerId ?? undefined,
          })

          // Atualizar bloco no array
          const idx = resolvedBlocks.findIndex((b) => b.id === block.id)
          if (idx !== -1 && result.text) {
            if (block.type === 'text') {
              (resolvedBlocks[idx].data as TextBlockData).content = result.text
            } else if (block.type === 'info-box') {
              (resolvedBlocks[idx].data as InfoBoxData).content = result.text
            }
            resolvedBlocks[idx].generatedByAi = true
            resolvedBlocks[idx].generationId = result.generationId
          }
        } catch {
          // Falha parcial — continua com próxima seção
        }
      }

      // 3. Atualizar relatório com blocos preenchidos
      // (o relatório já foi criado, atualizamos via API)
      await updateFormResponse(form.id, {
        ...response,
        generatedReportId: report.id,
      })

      onReportGenerated(report.id)
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao gerar o relatório.',
      )
    }
  }

  const handleClose = () => {
    setState('confirm')
    setErrorMessage('')
    onClose()
  }

  // Verificar se tem template
  const showNoTemplate = !template

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gerar Relatório com IA"
      size="md"
    >
      <div className="p-4 space-y-4">
        {showNoTemplate ? (
          /* No template linked */
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Este formulário não tem um template de relatório vinculado.
              Vincule um template no editor do formulário para usar a geração automática.
            </p>
            <div className="flex justify-center mt-4">
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : state === 'confirm' ? (
          /* Confirmation */
          <>
            <div className="bg-brand-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-brand-800 mb-2">Resumo da geração</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-brand-600 font-medium">Cliente:</dt>
                  <dd className="text-brand-800">{response?.customerName || '(sem nome)'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-600 font-medium">Formulário:</dt>
                  <dd className="text-brand-800">{form?.title || '(sem título)'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-600 font-medium">Template:</dt>
                  <dd className="text-brand-800">{template?.name}</dd>
                </div>
              </dl>
            </div>
            <p className="text-sm text-gray-500">
              A IA irá preencher automaticamente as seções de texto do relatório com base nas respostas do formulário.
              Você poderá revisar e ajustar tudo antes de finalizar.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate}>Gerar Relatório</Button>
            </div>
          </>
        ) : state === 'loading' ? (
          /* Loading */
          <div className="text-center py-8">
            <div className="mx-auto animate-spin w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full mb-4" />
            <p className="text-sm text-gray-600">Gerando relatório com IA...</p>
            {progress.total > 0 && (
              <>
                <p className="text-xs text-gray-500 mt-2">
                  Seção {progress.current} de {progress.total}
                  {progress.sectionName && `: ${progress.sectionName}`}
                </p>
                <div className="mt-3 mx-auto max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </>
            )}
            <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos</p>
          </div>
        ) : (
          /* Error */
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-1">Erro ao gerar relatório</p>
            <p className="text-xs text-gray-500 mb-4">{errorMessage}</p>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => setState('confirm')}>Tentar novamente</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
