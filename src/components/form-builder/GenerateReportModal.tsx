import { useState } from 'react'
import type { Form, FormResponse, ReportTemplate } from '@/types'
import { generateReportFromResponse } from '@/lib/ai-service'
import { getProfessional } from '@/lib/api/professional-api'
import { createReport } from '@/lib/api/report-api'
import { getCustomer } from '@/lib/api/customer-api'
import { updateFormResponse } from '@/lib/api/form-api'
import { buildVariableMap, resolveBlockVariables } from '@/lib/variable-service'
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

  const handleGenerate = async () => {
    if (!form || !response || !template) return

    setState('loading')
    setErrorMessage('')

    try {
      const professional = await getProfessional()
      const result = await generateReportFromResponse({
        form,
        response,
        template,
        professional,
      })

      // Resolve template variables on result blocks
      let customerData = null
      if (response.customerId) {
        try {
          const customer = await getCustomer(response.customerId)
          customerData = customer?.data ?? null
        } catch {
          // customer not found
        }
      }
      const variableMap = buildVariableMap(
        customerData,
        form,
        response,
      )
      const resolvedBlocks = resolveBlockVariables(result.blocks, variableMap)

      // Criar relatório via API
      const report = await createReport({
        status: 'rascunho',
        customerName: result.customerName || response.customerName,
        customerId: response.customerId ?? undefined,
        formResponseId: response.id,
        formId: form.id,
        blocks: resolvedBlocks,
      })

      // Atualizar resposta com link para o relatório
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
          : 'Erro desconhecido ao gerar o relatório.'
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
            <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
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
