import {
  ReportTemplate,
  TemplateBlock,
  createEmptyIdentificationData,
  createEmptyTextBlockData,
  createEmptyScoreTableData,
  createEmptyInfoBoxData,
  createEmptyChartData,
  createEmptyReferencesData,
  createEmptyClosingPageData,
} from '@/types'

// ========== Helper to build blocks ==========

function textBlock(order: number, title: string): TemplateBlock {
  const data = createEmptyTextBlockData()
  data.title = title
  return { type: 'text', order, data }
}

function scoreTableBlock(order: number, title: string): TemplateBlock {
  const data = createEmptyScoreTableData()
  data.title = title
  return { type: 'score-table', order, data }
}

function infoBoxBlock(order: number, label: string): TemplateBlock {
  const data = createEmptyInfoBoxData()
  data.label = label
  return { type: 'info-box', order, data }
}

function chartBlock(order: number, title: string): TemplateBlock {
  const data = createEmptyChartData()
  data.title = title
  return { type: 'chart', order, data }
}

function identificationBlock(order: number): TemplateBlock {
  return {
    type: 'identification',
    order,
    data: createEmptyIdentificationData(),
  }
}

function referencesBlock(order: number): TemplateBlock {
  return { type: 'references', order, data: createEmptyReferencesData() }
}

function closingPageBlock(order: number): TemplateBlock {
  return { type: 'closing-page', order, data: createEmptyClosingPageData() }
}

// ========== Default Templates ==========

const TEMPLATE_ADULTO: ReportTemplate = {
  id: 'default-adulto',
  name: 'Laudo Padrão Adulto',
  description: 'Estrutura completa para avaliação de adultos',
  isDefault: true,
  blocks: [
    identificationBlock(0),
    textBlock(1, 'DESCRIÇÃO DA DEMANDA E OBJETIVOS DA AVALIAÇÃO'),
    textBlock(2, 'PROCEDIMENTOS'),
    textBlock(3, 'ANAMNESE'),
    scoreTableBlock(4, 'RESULTADOS - ATENÇÃO'),
    scoreTableBlock(5, 'RESULTADOS - MEMÓRIA'),
    scoreTableBlock(6, 'RESULTADOS - FUNÇÕES EXECUTIVAS'),
    chartBlock(7, 'GRÁFICO DE DESEMPENHO'),
    textBlock(8, 'ANÁLISE E OBSERVAÇÕES'),
    infoBoxBlock(9, 'IMPRESSÃO DIAGNÓSTICA'),
    textBlock(10, 'SUGESTÕES E ENCAMINHAMENTOS'),
    textBlock(11, 'CONCLUSÃO'),
    referencesBlock(12),
    closingPageBlock(13),
  ],
}

const TEMPLATE_BREVE: ReportTemplate = {
  id: 'default-breve',
  name: 'Laudo Breve',
  description: 'Estrutura resumida para laudos mais curtos',
  isDefault: true,
  blocks: [
    identificationBlock(0),
    textBlock(1, 'DESCRIÇÃO DA DEMANDA'),
    textBlock(2, 'PROCEDIMENTOS'),
    scoreTableBlock(3, 'RESULTADOS'),
    infoBoxBlock(4, 'IMPRESSÃO DIAGNÓSTICA'),
    textBlock(5, 'CONCLUSÃO'),
    closingPageBlock(6),
  ],
}

export const DEFAULT_TEMPLATES: ReportTemplate[] = [
  TEMPLATE_ADULTO,
  TEMPLATE_BREVE,
]

// ========== Merge helper ==========

export function getAllTemplates(customTemplates: ReportTemplate[]): ReportTemplate[] {
  return [...DEFAULT_TEMPLATES, ...customTemplates]
}
