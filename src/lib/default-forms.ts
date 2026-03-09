import {
  AnamnesisForm,
  FormField,
  FormFieldOption,
  createEmptyFormField,
  createEmptyFormFieldOption,
} from '@/types'

// ========== Helpers ==========

function field(
  order: number,
  type: FormField['type'],
  label: string,
  overrides: Partial<FormField> = {}
): FormField {
  const f = createEmptyFormField(type, order)
  f.label = label
  return { ...f, ...overrides, id: f.id, order }
}

function option(label: string): FormFieldOption {
  const o = createEmptyFormFieldOption()
  o.label = label
  return o
}

function sectionHeader(order: number, label: string): FormField {
  return field(order, 'section-header', label)
}

// ========== Anamnese Adulto ==========

const FORM_ADULTO: AnamnesisForm = {
  id: 'default-anamnese-adulto',
  title: 'Anamnese — Adulto',
  description: 'Formulário padrão de anamnese para avaliação de adultos.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  linkedTemplateId: 'default-adulto',
  fieldMappings: [],
  fields: [
    // Dados pessoais
    sectionHeader(0, 'Dados Pessoais'),
    field(1, 'short-text', 'Nome completo', { required: true }),
    field(2, 'date', 'Data de nascimento', { required: true }),
    field(3, 'short-text', 'Escolaridade', { placeholder: 'Ex: Ensino Superior Completo' }),
    field(4, 'short-text', 'Profissão/Ocupação'),
    field(5, 'single-choice', 'Estado civil', {
      options: [option('Solteiro(a)'), option('Casado(a)'), option('Divorciado(a)'), option('Viúvo(a)')],
    }),

    // Queixa principal
    sectionHeader(6, 'Queixa Principal'),
    field(7, 'long-text', 'Qual o motivo da avaliação?', { required: true }),
    field(8, 'short-text', 'Quem encaminhou para a avaliação?'),
    field(9, 'long-text', 'Quando os sintomas começaram? Descreva como evoluíram.'),

    // Histórico de saúde
    sectionHeader(10, 'Histórico de Saúde'),
    field(11, 'long-text', 'Possui doenças diagnosticadas? Quais?'),
    field(12, 'long-text', 'Medicamentos em uso atual (nome e dosagem)'),
    field(13, 'yes-no', 'Já realizou cirurgias?'),
    field(14, 'long-text', 'Se sim, quais cirurgias?'),
    field(15, 'yes-no', 'Já sofreu traumatismo craniano?'),
    field(16, 'long-text', 'Histórico de internações hospitalares'),

    // Sono e hábitos
    sectionHeader(17, 'Sono e Hábitos'),
    field(18, 'single-choice', 'Qualidade do sono', {
      options: [option('Boa'), option('Regular'), option('Ruim'), option('Muito ruim')],
    }),
    field(19, 'short-text', 'Horas de sono por noite'),
    field(20, 'yes-no', 'Faz uso de bebida alcoólica?'),
    field(21, 'yes-no', 'Faz uso de tabaco?'),
    field(22, 'yes-no', 'Pratica atividade física?'),

    // Funções cognitivas
    sectionHeader(23, 'Queixas Cognitivas'),
    field(24, 'scale', 'Dificuldade de memória no dia a dia', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhuma',
      scaleMaxLabel: 'Muita',
    }),
    field(25, 'scale', 'Dificuldade de concentração/atenção', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhuma',
      scaleMaxLabel: 'Muita',
    }),
    field(26, 'multiple-choice', 'Quais dificuldades cognitivas percebe?', {
      options: [
        option('Esquecer compromissos'),
        option('Perder objetos'),
        option('Dificuldade para encontrar palavras'),
        option('Dificuldade para se organizar'),
        option('Dificuldade para tomar decisões'),
        option('Lentidão no raciocínio'),
      ],
    }),
    field(27, 'long-text', 'Descreva situações em que nota dificuldades cognitivas'),

    // Aspectos emocionais
    sectionHeader(28, 'Aspectos Emocionais'),
    field(29, 'scale', 'Nível de ansiedade', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhuma',
      scaleMaxLabel: 'Muita',
    }),
    field(30, 'scale', 'Nível de humor depressivo', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhum',
      scaleMaxLabel: 'Muito',
    }),
    field(31, 'yes-no', 'Faz ou já fez acompanhamento psicológico/psiquiátrico?'),
    field(32, 'long-text', 'Observações adicionais'),
  ],
}

// ========== Anamnese Infantil ==========

const FORM_INFANTIL: AnamnesisForm = {
  id: 'default-anamnese-infantil',
  title: 'Anamnese — Infantil',
  description: 'Formulário de anamnese para avaliação de crianças e adolescentes. Preenchido pelo responsável.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  linkedTemplateId: 'default-adulto',
  fieldMappings: [],
  fields: [
    // Dados da criança
    sectionHeader(0, 'Dados da Criança'),
    field(1, 'short-text', 'Nome completo da criança', { required: true }),
    field(2, 'date', 'Data de nascimento', { required: true }),
    field(3, 'short-text', 'Série/Ano escolar'),
    field(4, 'short-text', 'Escola'),
    field(5, 'short-text', 'Nome do responsável', { required: true }),
    field(6, 'short-text', 'Grau de parentesco com a criança'),

    // Queixa
    sectionHeader(7, 'Queixa Principal'),
    field(8, 'long-text', 'Qual o motivo da avaliação?', { required: true }),
    field(9, 'short-text', 'Quem encaminhou para a avaliação?'),
    field(10, 'long-text', 'Quando os sintomas começaram?'),

    // Desenvolvimento
    sectionHeader(11, 'Desenvolvimento'),
    field(12, 'single-choice', 'Tipo de parto', {
      options: [option('Normal'), option('Cesárea'), option('Fórceps')],
    }),
    field(13, 'yes-no', 'Houve intercorrências na gestação ou parto?'),
    field(14, 'long-text', 'Se sim, quais?'),
    field(15, 'short-text', 'Idade em que começou a andar'),
    field(16, 'short-text', 'Idade em que começou a falar'),
    field(17, 'yes-no', 'Controle esfincteriano adquirido?'),
    field(18, 'short-text', 'Idade do controle esfincteriano'),

    // Escolar
    sectionHeader(19, 'Vida Escolar'),
    field(20, 'short-text', 'Idade de entrada na escola'),
    field(21, 'yes-no', 'Já repetiu de ano?'),
    field(22, 'multiple-choice', 'Dificuldades escolares relatadas', {
      options: [
        option('Leitura'),
        option('Escrita'),
        option('Matemática'),
        option('Atenção em sala'),
        option('Comportamento'),
        option('Socialização'),
      ],
    }),
    field(23, 'long-text', 'Descreva o desempenho escolar atual'),

    // Comportamento
    sectionHeader(24, 'Comportamento'),
    field(25, 'scale', 'Nível de agitação/hiperatividade', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhum',
      scaleMaxLabel: 'Muito',
    }),
    field(26, 'scale', 'Nível de desatenção', {
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Nenhum',
      scaleMaxLabel: 'Muito',
    }),
    field(27, 'yes-no', 'A criança faz ou já fez acompanhamento (fono, TO, psicólogo)?'),
    field(28, 'long-text', 'Se sim, quais acompanhamentos?'),
    field(29, 'long-text', 'Observações adicionais do responsável'),
  ],
}

// ========== Anamnese Breve ==========

const FORM_BREVE: AnamnesisForm = {
  id: 'default-anamnese-breve',
  title: 'Anamnese Breve',
  description: 'Formulário resumido de anamnese para triagem rápida.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  linkedTemplateId: 'default-breve',
  fieldMappings: [],
  fields: [
    field(0, 'short-text', 'Nome completo', { required: true }),
    field(1, 'date', 'Data de nascimento', { required: true }),
    field(2, 'short-text', 'Escolaridade'),
    field(3, 'long-text', 'Motivo da avaliação', { required: true }),
    field(4, 'long-text', 'Doenças e medicamentos em uso'),
    field(5, 'multiple-choice', 'Queixas cognitivas', {
      options: [
        option('Memória'),
        option('Atenção'),
        option('Linguagem'),
        option('Orientação'),
        option('Funções executivas'),
      ],
    }),
    field(6, 'long-text', 'Observações adicionais'),
  ],
}

// ========== Exports ==========

export const DEFAULT_FORMS: AnamnesisForm[] = [
  FORM_ADULTO,
  FORM_INFANTIL,
  FORM_BREVE,
]

/**
 * Retorna todos os formulários (padrão + customizados).
 * Padrão sempre aparecem primeiro.
 */
export function getAllForms(customForms: AnamnesisForm[]): AnamnesisForm[] {
  // Não duplicar se o custom tem mesmo id de um default
  const defaultIds = new Set(DEFAULT_FORMS.map((f) => f.id))
  const filtered = customForms.filter((f) => !defaultIds.has(f.id))
  return [...DEFAULT_FORMS, ...filtered]
}
