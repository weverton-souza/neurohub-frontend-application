// ========== Contact / Social ==========

export type ContactType = 'instagram' | 'linkedin' | 'facebook' | 'website' | 'phone' | 'email'

export interface ContactItem {
  id: string
  type: ContactType
  value: string
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  website: 'Website',
  phone: 'Telefone',
  email: 'E-mail',
}

export const CONTACT_TYPE_OPTIONS: { value: ContactType; label: string }[] =
  (Object.entries(CONTACT_TYPE_LABELS) as [ContactType, string][]).map(
    ([value, label]) => ({ value, label })
  )

export function createEmptyContactItem(type: ContactType = 'instagram'): ContactItem {
  return {
    id: crypto.randomUUID(),
    type,
    value: '',
  }
}

// ========== Professional & Solicitor ==========

export interface Professional {
  name: string
  crp: string
  specialization: string
  phone?: string
  instagram?: string
  email?: string
  logo?: string                 // base64 data URL
  contactItems?: ContactItem[]  // footer contacts/social
}

export interface Solicitor {
  name: string
  crm?: string
  rqe?: string
  specialty?: string
}

// ========== Customer ==========

export interface CustomerData {
  name: string
  cpf: string
  birthDate: string // ISO date string
  age: string // editável — ex: "32 anos e 4 meses"
  education: string
  profession: string
  motherName: string
  fatherName: string
  guardianName?: string         // Nome do responsável legal
  guardianRelationship?: string // Grau de parentesco (Avó, Tio, etc.)
  // Contato
  phone?: string
  email?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
  // Clínico
  chiefComplaint?: string      // queixa principal
  diagnosis?: string
  medications?: string
  referralDoctor?: string      // médico solicitante
}

export interface Customer {
  id: string
  createdAt: string
  updatedAt: string
  data: CustomerData
}

export interface CustomerNote {
  id: string
  customerId: string
  createdAt: string
  updatedAt: string
  content: string
}

// ========== Customer Timeline ==========

export type CustomerEventType = 'consulta' | 'retorno' | 'avaliacao' | 'laudo' | 'observacao'

export const CUSTOMER_EVENT_TYPE_LABELS: Record<CustomerEventType, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  avaliacao: 'Avaliação',
  laudo: 'Laudo',
  observacao: 'Observação',
}

export const CUSTOMER_EVENT_TYPE_COLORS: Record<CustomerEventType, string> = {
  consulta: 'bg-blue-500',
  retorno: 'bg-emerald-500',
  avaliacao: 'bg-purple-500',
  laudo: 'bg-amber-500',
  observacao: 'bg-gray-400',
}

export interface CustomerEvent {
  id: string
  customerId: string
  type: CustomerEventType
  title: string
  description: string
  date: string       // ISO datetime — data/hora do evento
  createdAt: string
}

// ========== Block Data Types ==========

export interface IdentificationData {
  professional: Professional
  solicitor?: Solicitor
  customer: CustomerData
  date: string // data do relatório
  location: string // ex: "Belo Horizonte - MG"
}

export interface LabeledItem {
  id: string
  label: string
  text: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SlateNode = Record<string, any>
export type SlateContent = SlateNode[]

export interface TextBlockData {
  title: string
  subtitle: string
  content: string | SlateContent  // HTML (legado) ou Slate JSON (novo)
  labeledItems: LabeledItem[]
  useLabeledItems: boolean
}

/** Verifica se o conteúdo é Slate JSON (novo formato) */
export function isSlateContent(content: string | SlateContent): content is SlateContent {
  return Array.isArray(content)
}

/** Extrai texto puro de um SlateContent (para preview, busca, etc.) */
export function slateContentToPlainText(content: SlateContent): string {
  function extractText(nodes: SlateNode[]): string {
    return nodes
      .map((node) => {
        if (typeof node.text === 'string') return node.text
        if (Array.isArray(node.children)) return extractText(node.children)
        return ''
      })
      .join('')
  }
  return extractText(content)
}

/** Converte HTML legado para SlateContent (backward compat) */
export function htmlToSlateContent(html: string): SlateContent {
  if (!html || !html.trim()) return [{ type: 'p', children: [{ text: '' }] }]

  // Se não tem tags HTML, tratar como texto simples
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const lines = html.split('\n').filter((l) => l.trim())
    if (lines.length === 0) return [{ type: 'p', children: [{ text: '' }] }]
    return lines.map((line) => ({ type: 'p', children: [{ text: line }] }))
  }

  // Parse HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const nodes: SlateNode[] = []

  for (const child of Array.from(doc.body.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const children = htmlElementToSlateChildren(el)
      nodes.push({ type: 'p', children: children.length > 0 ? children : [{ text: '' }] })
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      nodes.push({ type: 'p', children: [{ text: child.textContent }] })
    }
  }

  return nodes.length > 0 ? nodes : [{ type: 'p', children: [{ text: '' }] }]
}

/** Helper: converte filhos de um elemento HTML em Slate text nodes */
function htmlElementToSlateChildren(
  node: Node,
  marks: { bold?: true; italic?: true; underline?: true; strikethrough?: true } = {},
): SlateNode[] {
  const result: SlateNode[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (text) {
        const leaf: SlateNode = { text }
        if (marks.bold) leaf.bold = true
        if (marks.italic) leaf.italic = true
        if (marks.underline) leaf.underline = true
        if (marks.strikethrough) leaf.strikethrough = true
        result.push(leaf)
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      const newMarks = { ...marks }
      if (tag === 'strong' || tag === 'b') newMarks.bold = true
      if (tag === 'em' || tag === 'i') newMarks.italic = true
      if (tag === 'u') newMarks.underline = true
      if (tag === 's' || tag === 'del' || tag === 'strike') newMarks.strikethrough = true
      result.push(...htmlElementToSlateChildren(el, newMarks))
    }
  }

  return result
}

/** Verifica se um SlateContent está efetivamente vazio */
export function isSlateContentEmpty(content: SlateContent): boolean {
  return slateContentToPlainText(content).trim() === ''
}

// ========== Score Table ==========

export interface ScoreTableColumn {
  id: string
  label: string
  formula?: string  // fórmula de texto, ex: "CLASSIFICAR([Percentil];>=98;\"Muito Superior\";...)"
  alignment?: 'left' | 'center' | 'right'
}

// Cada row guarda valores por column id
export interface ScoreTableRow {
  id: string
  values: Record<string, string> // chave = column.id, valor = conteúdo da célula (pode ser fórmula)
}

export interface ScoreTableData {
  title: string
  columns: ScoreTableColumn[]
  rows: ScoreTableRow[]
  footnote: string
  templateId?: string | null
}

// ========== Base Template ==========

export interface BaseTemplate {
  id: string
  name: string
  description: string
  instrumentName: string
  category: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ========== Score Table Templates ==========

export interface ScoreTableTemplateColumn {
  id: string
  label: string
  formula: string | null  // fórmula de texto ou null para input manual
}

export interface ScoreTableTemplateRow {
  id: string
  defaultValues: Record<string, string>  // inclui fórmulas como valores
}

export interface ScoreTableTemplate extends BaseTemplate {
  columns: ScoreTableTemplateColumn[]
  rows: ScoreTableTemplateRow[]
}

// ========== Chart Templates ==========

export interface ChartTemplate extends BaseTemplate {
  chartType: ChartType
  displayMode: ChartDisplayMode
  series: ChartSeries[]
  categories: ChartCategory[]
  referenceLines: ChartReferenceLine[]
  referenceRegions: ChartReferenceRegion[]
  yAxisLabel: string
  showValues: boolean
  showLegend: boolean
  showRegionLegend: boolean
}

export interface InfoBoxData {
  label: string
  content: string
}

// ========== Chart ==========

export interface ChartSeries {
  id: string
  label: string
  color: string
}

export interface ChartCategory {
  id: string
  label: string
  values: Record<string, number> // key = series.id, value = valor numérico
}

export interface ChartReferenceLine {
  id: string
  label: string
  value: number
  color: string
}

export interface ChartReferenceRegion {
  id: string
  label: string
  yMin: number
  yMax: number
  color: string       // cor de fundo (com opacidade, ex: "#27AE6033")
  borderColor: string
}

export type ChartType = 'bar' | 'line'
export type ChartDisplayMode = 'grouped' | 'separated'

export interface ChartData {
  title: string
  chartType: ChartType
  displayMode: ChartDisplayMode
  categories: ChartCategory[]
  series: ChartSeries[]
  referenceLines: ChartReferenceLine[]
  referenceRegions: ChartReferenceRegion[]
  yAxisLabel: string
  showValues: boolean
  showLegend: boolean
  showRegionLegend: boolean
  description: string
}

// ========== References ==========

export interface ReferencesData {
  title: string
  references: string[]
}

// ========== Closing Page ==========

export interface ClosingPageData {
  title: string
  bodyText: string
  // Assinaturas (profissional sempre aparece)
  showPatientSignature: boolean
  showMotherSignature: boolean
  showFatherSignature: boolean
  showGuardianSignature: boolean
  // Campo de escrita abaixo das assinaturas
  footerNote: string
  // backward compat — campo antigo, se existir
  showSignatureLines?: boolean
}

// ========== Block ==========

export type BlockType = 'identification' | 'text' | 'score-table' | 'info-box' | 'chart' | 'references' | 'closing-page'

export type BlockData = IdentificationData | TextBlockData | ScoreTableData | InfoBoxData | ChartData | ReferencesData | ClosingPageData

export interface Block {
  id: string
  type: BlockType
  order: number
  data: BlockData
  collapsed: boolean
}

// ========== Report ==========

export type ReportStatus = 'rascunho' | 'em_revisao' | 'finalizado'

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  finalizado: 'Finalizado',
}

export const REPORT_STATUS_COLORS: Record<ReportStatus, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  em_revisao: { bg: 'bg-blue-100', text: 'text-blue-700' },
  finalizado: { bg: 'bg-green-100', text: 'text-green-700' },
}

export const REPORT_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  rascunho: ['em_revisao', 'finalizado'],
  em_revisao: ['rascunho', 'finalizado'],
  finalizado: ['em_revisao'],
}

export interface Report {
  id: string
  createdAt: string
  updatedAt: string
  status: ReportStatus
  customerName: string
  customerId?: string
  formId?: string           // link para formulário de origem
  formResponseId?: string   // link para resposta de formulário que gerou este relatório
  blocks: Block[]
}

// ========== Report Versioning ==========

export interface ReportVersion {
  id: string
  reportId: string
  createdAt: string
  status: ReportStatus
  description: string
  customerName: string
  blocks: Block[]
}

// ========== Pagination (Spring Boot Page model) ==========

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number        // página atual (0-indexed)
  size: number          // itens por página
  first: boolean
  last: boolean
  empty: boolean
}

// ========== Templates ==========

export interface TemplateBlock {
  type: BlockType
  order: number
  data: BlockData
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  blocks: TemplateBlock[]
  isDefault: boolean
}

// Re-export block constants so existing imports from '@/types' still work
export { BLOCK_TYPE_LABELS, BLOCK_TYPE_DESCRIPTIONS } from '@/lib/block-constants'

// ========== Default Score Table Columns ==========

export const DEFAULT_SCORE_COLUMNS: ScoreTableColumn[] = [
  { id: 'col-instrumento', label: 'Instrumento/Subteste' },
  { id: 'col-valor-obtido', label: 'Valor Obtido' },
  { id: 'col-percentil', label: 'Percentil' },
  { id: 'col-classificacao', label: 'Classificação' },
]

// ========== Factory Functions ==========

export function createEmptyCustomerData(): CustomerData {
  return {
    name: '',
    cpf: '',
    birthDate: '',
    age: '',
    education: '',
    profession: '',
    motherName: '',
    fatherName: '',
  }
}

export function createEmptyCustomer(): Customer {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: createEmptyCustomerData(),
  }
}

export function createEmptyCustomerNote(customerId: string): CustomerNote {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    customerId,
    createdAt: now,
    updatedAt: now,
    content: '',
  }
}

export function createEmptyCustomerEvent(customerId: string, type: CustomerEventType = 'consulta'): CustomerEvent {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    customerId,
    type,
    title: '',
    description: '',
    date: now,
    createdAt: now,
  }
}

export function createEmptyProfessional(): Professional {
  return {
    name: '',
    crp: '',
    specialization: '',
  }
}

export function createEmptyIdentificationData(professional?: Professional): IdentificationData {
  return {
    professional: professional ?? createEmptyProfessional(),
    customer: createEmptyCustomerData(),
    date: new Date().toISOString().split('T')[0],
    location: '',
  }
}

export function createEmptyTextBlockData(): TextBlockData {
  return {
    title: '',
    subtitle: '',
    content: '',
    labeledItems: [],
    useLabeledItems: false,
  }
}

export function createEmptyScoreTableData(): ScoreTableData {
  return {
    title: '',
    columns: DEFAULT_SCORE_COLUMNS.map(c => ({ ...c })),
    rows: [],
    footnote: '',
  }
}

export function createEmptyInfoBoxData(): InfoBoxData {
  return {
    label: '',
    content: '',
  }
}

export function createEmptyChartData(): ChartData {
  const seriesId = crypto.randomUUID()
  return {
    title: '',
    chartType: 'bar',
    displayMode: 'grouped',
    series: [{ id: seriesId, label: 'Série 1', color: '#007AFF' }],
    categories: [],
    referenceLines: [],
    referenceRegions: [],
    yAxisLabel: '',
    showValues: true,
    showLegend: false,
    showRegionLegend: true,
    description: '',
  }
}

export const DEFAULT_CLOSING_PAGE_TEXT =
  'Declaro que recebi o presente documento, contendo os resultados da avaliação realizada, e que fui orientado(a) sobre o conteúdo do mesmo. Estou ciente de que este relatório é de caráter confidencial e que as informações aqui contidas são de uso exclusivo para os fins a que se destina.'

export function createEmptyReferencesData(): ReferencesData {
  return {
    title: 'REFERÊNCIAS BIBLIOGRÁFICAS',
    references: [''],
  }
}

export function createEmptyClosingPageData(): ClosingPageData {
  return {
    title: 'TERMO DE ENTREGA E CIÊNCIA',
    bodyText: DEFAULT_CLOSING_PAGE_TEXT,
    showPatientSignature: true,
    showMotherSignature: false,
    showFatherSignature: false,
    showGuardianSignature: false,
    footerNote: '',
  }
}

export function createScoreTableColumn(label: string = ''): ScoreTableColumn {
  return {
    id: `col-${crypto.randomUUID()}`,
    label,
  }
}

export function createEmptyScoreTableRow(columns: ScoreTableColumn[]): ScoreTableRow {
  const values: Record<string, string> = {}
  for (const col of columns) {
    values[col.id] = ''
  }
  return {
    id: crypto.randomUUID(),
    values,
  }
}

// ========== Formula Factory Functions ==========

export function createScoreTableFromTemplate(template: ScoreTableTemplate): ScoreTableData {
  const columns: ScoreTableColumn[] = template.columns.map(c => ({
    id: c.id,
    label: c.label,
    formula: c.formula ?? undefined,
  }))

  const rows: ScoreTableRow[] = template.rows.map(r => ({
    id: crypto.randomUUID(),
    values: { ...r.defaultValues },
  }))

  return {
    title: template.name,
    columns,
    rows,
    footnote: '',
    templateId: template.id,
  }
}

export function createChartFromTemplate(template: ChartTemplate): ChartData {
  // Gerar novos UUIDs para as séries e mapear old→new
  const seriesIdMap = new Map<string, string>()
  const newSeries = template.series.map(s => {
    const newId = crypto.randomUUID()
    seriesIdMap.set(s.id, newId)
    return { ...s, id: newId }
  })

  const newCategories = template.categories.map(c => {
    const newValues: Record<string, number> = {}
    for (const [oldSeriesId, value] of Object.entries(c.values)) {
      const newSeriesId = seriesIdMap.get(oldSeriesId) ?? oldSeriesId
      newValues[newSeriesId] = value
    }
    return { id: crypto.randomUUID(), label: c.label, values: newValues }
  })

  return {
    title: template.name,
    chartType: template.chartType,
    displayMode: template.displayMode,
    series: newSeries,
    categories: newCategories,
    referenceLines: template.referenceLines.map(r => ({ ...r, id: crypto.randomUUID() })),
    referenceRegions: template.referenceRegions.map(r => ({ ...r, id: crypto.randomUUID() })),
    yAxisLabel: template.yAxisLabel,
    showValues: template.showValues,
    showLegend: template.showLegend,
    showRegionLegend: template.showRegionLegend,
    description: '',
  }
}

// ========== Form ==========

export type FormFieldType =
  | 'short-text'
  | 'long-text'
  | 'single-choice'
  | 'multiple-choice'
  | 'scale'
  | 'yes-no'
  | 'date'
  | 'section-header'

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  'short-text': 'Texto Curto',
  'long-text': 'Texto Longo',
  'single-choice': 'Escolha Única',
  'multiple-choice': 'Múltipla Escolha',
  'scale': 'Escala',
  'yes-no': 'Sim/Não',
  'date': 'Data',
  'section-header': 'Cabeçalho de Seção',
}

export const FORM_FIELD_TYPE_DESCRIPTIONS: Record<FormFieldType, string> = {
  'short-text': 'Resposta breve em uma linha',
  'long-text': 'Resposta longa em múltiplas linhas',
  'single-choice': 'Selecionar uma opção entre várias',
  'multiple-choice': 'Selecionar várias opções',
  'scale': 'Escala numérica (ex: 1 a 5)',
  'yes-no': 'Resposta Sim ou Não',
  'date': 'Seletor de data',
  'section-header': 'Título de seção para organizar o formulário',
}

export interface FormFieldOption {
  id: string
  label: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string              // texto da pergunta / título da seção
  description: string        // texto auxiliar abaixo da pergunta
  required: boolean
  order: number
  // Configuração específica por tipo
  options: FormFieldOption[]  // para single-choice, multiple-choice
  scaleMin: number            // para scale (default 1)
  scaleMax: number            // para scale (default 5)
  scaleMinLabel: string       // ex: "Nunca"
  scaleMaxLabel: string       // ex: "Sempre"
  placeholder: string         // para short-text, long-text
  variableKey: string         // chave para {{variableKey}} em templates (ex: "queixa_principal")
}

// ========== Template Variables ==========

export type VariableMap = Record<string, string>

export interface VariableInfo {
  key: string
  label: string
  source: 'customer' | 'form' | 'backend'
}

export interface FormFieldMapping {
  fieldId: string             // FormField.id
  targetSection: string       // ex: "ANAMNESE", "IDENTIFICAÇÃO"
  hint: string                // dica livre para a IA, ex: "nível de escolaridade do paciente"
}

export interface Form {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  fields: FormField[]
  linkedTemplateId: string | null  // link para ReportTemplate.id
  fieldMappings: FormFieldMapping[]
  isDefault?: boolean
}

export type FormResponseStatus = 'em_andamento' | 'concluido'

export const FORM_RESPONSE_STATUS_LABELS: Record<FormResponseStatus, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

export const FORM_RESPONSE_STATUS_COLORS: Record<FormResponseStatus, { bg: string; text: string }> = {
  em_andamento: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  concluido: { bg: 'bg-green-100', text: 'text-green-700' },
}

export interface FormFieldAnswer {
  fieldId: string
  value: string               // para short-text, long-text, date, yes-no ("sim"/"não")
  selectedOptionIds: string[]  // para single-choice (1 item), multiple-choice (N items)
  scaleValue: number | null    // para scale
}

export interface FormResponse {
  id: string
  formId: string
  customerId: string | null     // link opcional ao cadastro de clientes
  customerName: string          // sempre armazenado (pode não estar no cadastro)
  status: FormResponseStatus
  answers: FormFieldAnswer[]
  createdAt: string
  updatedAt: string
  generatedReportId: string | null  // preenchido após IA gerar o relatório
}

// ========== Form Factory Functions ==========

export function createEmptyFormFieldOption(): FormFieldOption {
  return {
    id: crypto.randomUUID(),
    label: '',
  }
}

export function createEmptyFormField(type: FormFieldType = 'short-text', order: number = 0): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    description: '',
    required: false,
    order,
    options: type === 'single-choice' || type === 'multiple-choice'
      ? [createEmptyFormFieldOption(), createEmptyFormFieldOption()]
      : [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: '',
    scaleMaxLabel: '',
    placeholder: '',
    variableKey: '',
  }
}

export function createEmptyForm(): Form {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [],
    linkedTemplateId: null,
    fieldMappings: [],
  }
}

export function createEmptyFormFieldAnswer(fieldId: string): FormFieldAnswer {
  return {
    fieldId,
    value: '',
    selectedOptionIds: [],
    scaleValue: null,
  }
}

export function createEmptyFormResponse(formId: string): FormResponse {
  return {
    id: crypto.randomUUID(),
    formId,
    customerId: null,
    customerName: '',
    status: 'em_andamento',
    answers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedReportId: null,
  }
}

// ========== Form Section Grouping ==========

export interface FormSectionGroup {
  sectionFieldId: string
  sectionTitle: string
  sectionField: FormField | null
  children: FormField[]
}

// ========== API Error Types (RFC 7807 ProblemDetail) ==========

export type ApiErrorCode =
  | 'RESOURCE_NOT_FOUND'
  | 'DUPLICATE_RESOURCE'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'ACCESS_DENIED'
  | 'BUSINESS_RULE_VIOLATION'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

export interface ValidationFieldError {
  field: string
  message: string
  rejectedValue: unknown
}

export interface ProblemDetailProperties {
  errorCode: ApiErrorCode
  timestamp: string
  resource?: string
  identifier?: string
  field?: string
  value?: string
  errors?: ValidationFieldError[]
  traceId?: string
}

export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  properties: ProblemDetailProperties
}

// ========== Public Form ==========

export type FormLinkStatus = 'PENDING' | 'ANSWERED' | 'EXPIRED'

export interface FormLink {
  id: string
  token: string
  formId: string
  customerId: string
  status: FormLinkStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface PublicFormData {
  formTitle: string
  formDescription: string | null
  fields: FormField[]
  customerName: string | null
  expiresAt: string
}

// ========== Auth Types ==========

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  vertical?: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface SwitchTenantRequest {
  tenantId: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  name: string
  tenantId: string
  vertical: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  tenantId: string
  vertical: string
}

// ========== Workspace Types ==========

export type TenantType = 'PERSONAL' | 'ORGANIZATION'
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Workspace {
  tenantId: string
  name: string
  type: TenantType
  vertical: string
  role: MemberRole | null
}
