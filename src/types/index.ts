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

// ========== Patient ==========

export interface PatientData {
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

export interface Patient {
  id: string
  createdAt: string
  updatedAt: string
  data: PatientData
}

export interface PatientNote {
  id: string
  patientId: string
  createdAt: string
  updatedAt: string
  content: string
}

// ========== Patient Timeline ==========

export type PatientEventType = 'consulta' | 'retorno' | 'avaliacao' | 'laudo' | 'observacao'

export const PATIENT_EVENT_TYPE_LABELS: Record<PatientEventType, string> = {
  consulta: 'Consulta',
  retorno: 'Retorno',
  avaliacao: 'Avaliação',
  laudo: 'Laudo',
  observacao: 'Observação',
}

export const PATIENT_EVENT_TYPE_COLORS: Record<PatientEventType, string> = {
  consulta: 'bg-blue-500',
  retorno: 'bg-emerald-500',
  avaliacao: 'bg-purple-500',
  laudo: 'bg-amber-500',
  observacao: 'bg-gray-400',
}

export interface PatientEvent {
  id: string
  patientId: string
  type: PatientEventType
  title: string
  description: string
  date: string       // ISO datetime — data/hora do evento
  createdAt: string
}

// ========== Block Data Types ==========

export interface IdentificationData {
  professional: Professional
  solicitor?: Solicitor
  patient: PatientData
  date: string // data do laudo
  location: string // ex: "Belo Horizonte - MG"
}

export interface LabeledItem {
  id: string
  label: string
  text: string
}

export interface TextBlockData {
  title: string
  subtitle: string
  content: string
  labeledItems: LabeledItem[]
  useLabeledItems: boolean
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

export interface ScoreTableTemplate {
  id: string
  name: string
  description: string
  instrumentName: string
  category: string
  columns: ScoreTableTemplateColumn[]
  rows: ScoreTableTemplateRow[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
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

// ========== Laudo ==========

export type LaudoStatus = 'rascunho' | 'em_revisao' | 'finalizado'

export const LAUDO_STATUS_LABELS: Record<LaudoStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  finalizado: 'Finalizado',
}

export const LAUDO_STATUS_COLORS: Record<LaudoStatus, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  em_revisao: { bg: 'bg-blue-100', text: 'text-blue-700' },
  finalizado: { bg: 'bg-green-100', text: 'text-green-700' },
}

export const LAUDO_STATUS_TRANSITIONS: Record<LaudoStatus, LaudoStatus[]> = {
  rascunho: ['em_revisao', 'finalizado'],
  em_revisao: ['rascunho', 'finalizado'],
  finalizado: ['em_revisao'],
}

export interface Laudo {
  id: string
  createdAt: string
  updatedAt: string
  status: LaudoStatus
  patientName: string
  patientId?: string
  formResponseId?: string  // link para resposta de formulário que gerou este laudo
  blocks: Block[]
}

// ========== Laudo Versioning ==========

export interface LaudoVersion {
  id: string
  laudoId: string
  createdAt: string
  status: LaudoStatus
  description: string
  patientName: string
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

export interface LaudoTemplate {
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

export function createEmptyPatient(): PatientData {
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

export function createEmptyPatientRecord(): Patient {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: createEmptyPatient(),
  }
}

export function createEmptyPatientNote(patientId: string): PatientNote {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    patientId,
    createdAt: now,
    updatedAt: now,
    content: '',
  }
}

export function createEmptyPatientEvent(patientId: string, type: PatientEventType = 'consulta'): PatientEvent {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    patientId,
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
    patient: createEmptyPatient(),
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
    series: [{ id: seriesId, label: 'Série 1', color: '#2E86C1' }],
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
  'Declaro que recebi o presente documento, contendo os resultados da avaliação neuropsicológica realizada, e que fui orientado(a) sobre o conteúdo do mesmo. Estou ciente de que este relatório é de caráter confidencial e que as informações aqui contidas são de uso exclusivo para os fins a que se destina.'

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

// ========== Anamnesis Form ==========

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
  source: 'patient' | 'form' | 'backend'
}

export interface FormFieldMapping {
  fieldId: string             // FormField.id
  targetSection: string       // ex: "ANAMNESE", "IDENTIFICAÇÃO"
  hint: string                // dica livre para a IA, ex: "nível de escolaridade do paciente"
}

export interface AnamnesisForm {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  fields: FormField[]
  linkedTemplateId: string | null  // link para LaudoTemplate.id
  fieldMappings: FormFieldMapping[]
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
  patientId: string | null     // link opcional ao cadastro de pacientes
  patientName: string          // sempre armazenado (pode não estar no cadastro)
  status: FormResponseStatus
  answers: FormFieldAnswer[]
  createdAt: string
  updatedAt: string
  generatedLaudoId: string | null  // preenchido após IA gerar o laudo
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

export function createEmptyAnamnesisForm(): AnamnesisForm {
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
    patientId: null,
    patientName: '',
    status: 'em_andamento',
    answers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedLaudoId: null,
  }
}

// ========== Form Section Grouping ==========

export interface FormFieldMeta {
  sectionTitle: string
  sectionFieldId: string
  isSection: boolean
}

export interface FormSectionGroup {
  sectionFieldId: string
  sectionTitle: string
  sectionField: FormField | null
  children: FormField[]
}
