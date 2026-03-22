import type {
  VariableMap,
  VariableInfo,
  CustomerData,
  Form,
  FormField,
  FormResponse,
  Block,
  TextBlockData,
  InfoBoxData,
  SlateContent,
  SlateNode,
} from '@/types'
import { isSlateContent } from '@/types'

// ========== Regex ==========

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

// ========== Customer Variables ==========

const CUSTOMER_VARIABLE_DEFS: { key: string; label: string; field: keyof CustomerData }[] = [
  { key: 'paciente_nome', label: 'Nome do Paciente', field: 'name' },
  { key: 'paciente_cpf', label: 'CPF', field: 'cpf' },
  { key: 'paciente_data_nascimento', label: 'Data de Nascimento', field: 'birthDate' },
  { key: 'paciente_idade', label: 'Idade', field: 'age' },
  { key: 'paciente_escolaridade', label: 'Escolaridade', field: 'education' },
  { key: 'paciente_profissao', label: 'Profissão', field: 'profession' },
  { key: 'paciente_mae', label: 'Nome da Mãe', field: 'motherName' },
  { key: 'paciente_pai', label: 'Nome do Pai', field: 'fatherName' },
  { key: 'paciente_responsavel', label: 'Responsável', field: 'guardianName' },
  { key: 'paciente_telefone', label: 'Telefone', field: 'phone' },
  { key: 'paciente_email', label: 'E-mail', field: 'email' },
  { key: 'paciente_endereco', label: 'Endereço', field: 'addressStreet' },
  { key: 'paciente_cidade', label: 'Cidade', field: 'addressCity' },
  { key: 'paciente_estado', label: 'Estado', field: 'addressState' },
  { key: 'paciente_cep', label: 'CEP', field: 'addressZipCode' },
  { key: 'paciente_queixa', label: 'Queixa Principal', field: 'chiefComplaint' },
  { key: 'paciente_diagnostico', label: 'Diagnóstico', field: 'diagnosis' },
  { key: 'paciente_medicamentos', label: 'Medicamentos', field: 'medications' },
  { key: 'paciente_medico', label: 'Médico Solicitante', field: 'referralDoctor' },
]

/**
 * Returns customer variable definitions as VariableInfo items.
 */
export function getCustomerVariableInfos(): VariableInfo[] {
  return CUSTOMER_VARIABLE_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    source: 'customer' as const,
  }))
}

/**
 * Returns form field variable definitions as VariableInfo items.
 */
export function getFormVariableInfos(form: Form): VariableInfo[] {
  return form.fields
    .filter((f) => f.type !== 'section-header' && (f.variableKey ?? ''))
    .map((f) => ({
      key: f.variableKey,
      label: f.label || f.variableKey,
      source: 'form' as const,
    }))
}

/**
 * Returns all available variable infos (customer + form).
 */
export function getAllVariableInfos(form: Form | null): VariableInfo[] {
  const customer = getCustomerVariableInfos()
  const formVars = form ? getFormVariableInfos(form) : []
  return [...customer, ...formVars]
}

// ========== Answer Display ==========

/**
 * Resolves a FormFieldAnswer to a human-readable display string.
 * Returns empty string when there's no meaningful value.
 * Used by both variable resolution and prompt building.
 */
export function resolveAnswerDisplay(
  field: FormField,
  answer: { value: string; selectedOptionIds: string[]; scaleValue: number | null },
): string {
  switch (field.type) {
    case 'short-text':
    case 'long-text':
    case 'date':
      return answer.value || ''

    case 'yes-no':
      return answer.value === 'sim' ? 'Sim' : answer.value === 'não' ? 'Não' : answer.value || ''

    case 'single-choice':
    case 'multiple-choice': {
      if (answer.selectedOptionIds.length === 0) return ''
      const selectedLabels = answer.selectedOptionIds
        .map((optId) => field.options.find((o) => o.id === optId)?.label)
        .filter(Boolean)
      return selectedLabels.join(', ')
    }

    case 'scale':
      return answer.scaleValue != null ? String(answer.scaleValue) : ''

    default:
      return answer.value || ''
  }
}

// ========== Variable Resolution ==========

/**
 * Builds a VariableMap from customer data.
 */
function getCustomerVariables(customer: CustomerData | null): VariableMap {
  if (!customer) return {}
  const map: VariableMap = {}
  for (const def of CUSTOMER_VARIABLE_DEFS) {
    const value = customer[def.field]
    if (value) map[def.key] = String(value)
  }
  return map
}

/**
 * Builds a VariableMap from form response answers.
 * Only fields with variableKey set are included.
 */
function getFormVariables(form: Form, response: FormResponse): VariableMap {
  const map: VariableMap = {}

  for (const field of form.fields) {
    const varKey = field.variableKey ?? ''
    if (!varKey || field.type === 'section-header') continue

    const answer = response.answers.find((a) => a.fieldId === field.id)
    if (!answer) continue

    const value = resolveAnswerDisplay(field, answer)
    if (value) map[varKey] = value
  }

  return map
}

/**
 * Builds a unified VariableMap from all available sources.
 * Priority: backendData > form > customer (last wins).
 */
export function buildVariableMap(
  customer: CustomerData | null,
  form: Form | null,
  response: FormResponse | null,
  backendData?: Record<string, string>,
): VariableMap {
  const map: VariableMap = {
    ...getCustomerVariables(customer),
    ...(form && response ? getFormVariables(form, response) : {}),
    ...(backendData ?? {}),
  }
  return map
}

// ========== Template Resolution ==========

/**
 * Replaces {{key}} placeholders in a string with their values.
 * Unresolved variables remain as {{key}} for manual editing.
 */
function resolveVariables(text: string, variables: VariableMap): string {
  if (!text) return text
  return text.replace(VARIABLE_REGEX, (match, key: string) => {
    return variables[key] ?? match
  })
}

/**
 * Resolves {{key}} variables in Slate JSON content.
 * Walks recursively through text nodes replacing placeholders.
 */
function resolveSlateVariables(content: SlateContent, variables: VariableMap): SlateContent {
  function resolveNode(node: SlateNode): SlateNode {
    if (typeof node.text === 'string') {
      return { ...node, text: resolveVariables(node.text, variables) }
    }
    if (Array.isArray(node.children)) {
      return { ...node, children: node.children.map(resolveNode) }
    }
    return node
  }
  return content.map(resolveNode)
}

/**
 * Resolves variables in content (string or SlateContent).
 */
function resolveContentVariables(
  content: string | SlateContent,
  variables: VariableMap,
): string | SlateContent {
  if (isSlateContent(content)) return resolveSlateVariables(content, variables)
  return resolveVariables(content, variables)
}

/**
 * Applies variable resolution to all text and info-box blocks.
 * Returns a new Block[] with resolved content.
 * Other block types are returned unchanged.
 */
export function resolveBlockVariables(blocks: Block[], variables: VariableMap): Block[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'text': {
        const data = block.data as TextBlockData
        return {
          ...block,
          data: {
            ...data,
            title: resolveVariables(data.title, variables),
            subtitle: resolveVariables(data.subtitle, variables),
            content: resolveContentVariables(data.content, variables),
            labeledItems: data.labeledItems.map((item) => ({
              ...item,
              label: resolveVariables(item.label, variables),
              text: resolveVariables(item.text, variables),
            })),
          },
        }
      }
      case 'info-box': {
        const data = block.data as InfoBoxData
        return {
          ...block,
          data: {
            ...data,
            label: resolveVariables(data.label, variables),
            content: resolveVariables(data.content, variables),
          },
        }
      }
      default:
        return block
    }
  })
}

// ========== Utilities ==========

/**
 * Sanitizes a user-entered variable key.
 * Lowercase, no special chars, underscores for spaces.
 */
export function sanitizeVariableKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9_]/g, '_')     // non-alphanumeric → underscore
    .replace(/_+/g, '_')             // collapse multiple underscores
    .replace(/^_|_$/g, '')           // trim leading/trailing underscores
}
