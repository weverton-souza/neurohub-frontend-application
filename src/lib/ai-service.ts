import type {
  Form,
  FormResponse,
  FormFieldAnswer,
  Block,
  ReportTemplate,
  Professional,
  TextBlockData,
  InfoBoxData,
} from '@/types'
import { FORM_FIELD_TYPE_LABELS } from '@/types'
import { BLOCK_TYPE_LABELS, getBlockTitle } from '@/lib/block-constants'
import { resolveAnswerDisplay } from '@/lib/variable-service'

// ========== Interfaces (contratos para o backend) ==========

export interface ReportGenerationRequest {
  form: Form
  response: FormResponse
  template: ReportTemplate
  professional: Professional
}

export interface ReportGenerationResult {
  blocks: Block[]
  customerName: string
}

// ========== Prompt Builder ==========

function formatAnswer(field: Form['fields'][0], answer: FormFieldAnswer): string {
  const value = resolveAnswerDisplay(field, answer)
  return value || '(não respondido)'
}

/**
 * Constrói o prompt que será enviado à IA via backend.
 * Retorna o texto completo do prompt em português.
 */
export function buildPrompt(request: ReportGenerationRequest): string {
  const { form, response, template } = request

  // Estrutura do template
  const templateStructure = template.blocks
    .map((block, i) => {
      const title = getBlockTitle(block)
      const type = BLOCK_TYPE_LABELS[block.type] || block.type
      return `  ${i + 1}. [${type}] ${title}`
    })
    .join('\n')

  // Respostas do formulário (sem dados identificáveis)
  const questionFields = form.fields.filter(f => f.type !== 'section-header')
  const answersText = questionFields
    .map((field) => {
      const answer = response.answers.find(a => a.fieldId === field.id)
      if (!answer) return null

      const mapping = form.fieldMappings.find(m => m.fieldId === field.id)
      const targetInfo = mapping?.targetSection
        ? ` [Seção alvo: ${mapping.targetSection}]`
        : ''
      const hintInfo = mapping?.hint ? ` [Dica: ${mapping.hint}]` : ''

      return `  - ${field.label} (${FORM_FIELD_TYPE_LABELS[field.type]}): ${formatAnswer(field, answer)}${targetInfo}${hintInfo}`
    })
    .filter(Boolean)
    .join('\n')

  // Variáveis definidas nos campos do formulário
  const variableFields = form.fields.filter(f => (f.variableKey ?? ''))
  const variablesText = variableFields.length > 0
    ? variableFields.map((field) => {
        const answer = response.answers.find(a => a.fieldId === field.id)
        const value = answer ? formatAnswer(field, answer) : '(não respondido)'
        return `  - {{${field.variableKey}}} = ${value} (${field.label})`
      }).join('\n')
    : ''

  // Blocos que a IA pode preencher
  const fillableBlocks = template.blocks
    .filter(b => b.type === 'text' || b.type === 'info-box')
    .map(b => getBlockTitle(b))
    .join(', ')

  return `Você é um assistente especializado em relatórios de avaliação (laudos).
Sua tarefa é preencher os blocos de texto de um laudo com base nas respostas de um formulário de anamnese.

## Estrutura do Template de Laudo

${templateStructure}

## Respostas do Formulário de Anamnese

Nome do paciente: ${response.customerName}

${answersText}

${variablesText ? `## Variáveis Resolvidas

As seguintes variáveis de template (formato {{chave}}) já foram substituídas automaticamente no laudo.
Use os valores abaixo como contexto ao redigir as seções:

${variablesText}

` : ''}## Instruções

1. Preencha APENAS os blocos de tipo "Texto" e "Info Box": ${fillableBlocks}
2. NÃO preencha blocos de tipo "Tabela de Escores", "Gráfico", "Referências" ou "Termo de Entrega" — estes requerem dados de instrumentos específicos.
3. Escreva em português brasileiro, usando linguagem clínica e profissional.
4. Organize as informações nas seções apropriadas conforme os mapeamentos indicados (quando fornecidos).
5. Se não houver informações suficientes para uma seção, use o placeholder "[A ser preenchido pelo profissional]".
6. Para a seção de Anamnese, organize as informações de forma narrativa e coerente.
7. Para a seção de Impressão Diagnóstica (Info Box), mencione que uma avaliação mais detalhada será necessária.

## Formato de Saída

Responda APENAS com um JSON válido no seguinte formato:

{
  "patientName": "${response.customerName}",
  "blocks": [
    {
      "type": "text",
      "title": "TÍTULO DA SEÇÃO",
      "content": "Conteúdo gerado pela IA..."
    },
    {
      "type": "info-box",
      "label": "LABEL DO INFO BOX",
      "content": "Conteúdo gerado pela IA..."
    }
  ]
}

Inclua apenas os blocos que você preencheu (texto e info-box). Não inclua blocos vazios.`
}

// ========== Response Parser ==========

interface AIBlockOutput {
  type: string
  title?: string
  label?: string
  content?: string
}

interface AIRawOutput {
  patientName: string
  blocks: AIBlockOutput[]
}

/**
 * Faz o parse da resposta JSON da IA e retorna os blocos estruturados.
 * Lida com markdown code fences e JSON malformado.
 */
export function parseAIResponse(raw: string, template: ReportTemplate): ReportGenerationResult {
  // Remove markdown code fences se existirem
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  let parsed: AIRawOutput
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Fallback: retorna resultado vazio
    return {
      customerName: '',
      blocks: template.blocks.map((tb, i) => ({
        id: crypto.randomUUID(),
        type: tb.type,
        order: i,
        data: JSON.parse(JSON.stringify(tb.data)),
        collapsed: false,
      })),
    }
  }

  // Mapeia os blocos do template, preenchendo com dados da IA quando disponível
  const blocks: Block[] = template.blocks.map((tb, i) => {
    const block: Block = {
      id: crypto.randomUUID(),
      type: tb.type,
      order: i,
      data: JSON.parse(JSON.stringify(tb.data)),
      collapsed: false,
    }

    if (tb.type === 'text') {
      const tbTitle = (tb.data as TextBlockData).title
      const aiBlock = parsed.blocks.find(
        (ab) => ab.type === 'text' && ab.title === tbTitle
      )
      if (aiBlock?.content) {
        (block.data as TextBlockData).content = aiBlock.content
      }
    }

    if (tb.type === 'info-box') {
      const tbLabel = (tb.data as InfoBoxData).label
      const aiBlock = parsed.blocks.find(
        (ab) => ab.type === 'info-box' && ab.label === tbLabel
      )
      if (aiBlock?.content) {
        (block.data as InfoBoxData).content = aiBlock.content
      }
    }

    return block
  })

  return {
    customerName: parsed.patientName || '',
    blocks,
  }
}

// ========== Gerador (placeholder para backend) ==========

/**
 * Gera um laudo a partir das respostas do formulário usando IA.
 *
 * PLACEHOLDER: Esta função será implementada pelo backend.
 * Atualmente lança um erro informativo.
 *
 * Quando o backend estiver pronto, substituir por:
 *   const res = await fetch('/api/ai/generate-laudo', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(request),
 *   })
 *   return await res.json()
 */
export async function generateReportFromResponse(
  request: ReportGenerationRequest
): Promise<ReportGenerationResult> {
  // O prompt está pronto — basta enviá-lo ao backend
  // buildPrompt(request) gera o texto completo
  void request

  throw new Error(
    'O serviço de IA ainda não está configurado. ' +
    'Configure o backend para utilizar a geração automática de laudos.'
  )
}
