import type {
  ChartTemplate,
  ChartSeries,
  ChartCategory,
  ChartReferenceLine,
  ChartReferenceRegion,
} from '@/types'

// ========== Helpers ==========

function series(id: string, label: string, color: string): ChartSeries {
  return { id, label, color }
}

function category(id: string, label: string, seriesId: string, value: number = 0): ChartCategory {
  return { id, label, values: { [seriesId]: value } }
}

function refLine(id: string, label: string, value: number, color: string = '#D63031'): ChartReferenceLine {
  return { id, label, value, color }
}

function refRegion(
  id: string, label: string, yMin: number, yMax: number, color: string, borderColor: string,
): ChartReferenceRegion {
  return { id, label, yMin, yMax, color, borderColor }
}

const NOW = '2026-03-08T00:00:00.000Z'

// ========== Regiões de referência reutilizáveis ==========

// Faixas Wechsler para escores ponderados (scaled scores, M=10 SD=3)
function wechslerScaledRegions(): ChartReferenceRegion[] {
  return [
    refRegion('wr-1', 'Ext. Baixo', 1, 3, '#D6303122', '#D63031'),
    refRegion('wr-2', 'Limítrofe', 4, 5, '#E1705522', '#E17055'),
    refRegion('wr-3', 'Médio Inferior', 6, 7, '#FDCB6E22', '#FDCB6E'),
    refRegion('wr-4', 'Médio', 8, 12, '#00B89422', '#00B894'),
    refRegion('wr-5', 'Médio Superior', 13, 13, '#55EFC422', '#55EFC4'),
    refRegion('wr-6', 'Superior', 14, 15, '#0984E322', '#0984E3'),
    refRegion('wr-7', 'Muito Superior', 16, 19, '#6C5CE722', '#6C5CE7'),
  ]
}

// Faixas Wechsler para escores padrão (standard scores, M=100 SD=15)
function wechslerStandardRegions(): ChartReferenceRegion[] {
  return [
    refRegion('ws-1', 'Ext. Baixo', 40, 69, '#D6303122', '#D63031'),
    refRegion('ws-2', 'Limítrofe', 70, 79, '#E1705522', '#E17055'),
    refRegion('ws-3', 'Médio Inferior', 80, 89, '#FDCB6E22', '#FDCB6E'),
    refRegion('ws-4', 'Médio', 90, 109, '#00B89422', '#00B894'),
    refRegion('ws-5', 'Médio Superior', 110, 119, '#55EFC422', '#55EFC4'),
    refRegion('ws-6', 'Superior', 120, 129, '#0984E322', '#0984E3'),
    refRegion('ws-7', 'Muito Superior', 130, 160, '#6C5CE722', '#6C5CE7'),
  ]
}

// ========== 1. WAIS-III — Perfil de Subtestes ==========

const WAIS_SUBTESTES_SERIES = 'wais-sub-s1'

const WAIS_SUBTESTES_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-wais-subtestes',
  name: 'WAIS-III — Perfil de Subtestes',
  description: 'Gráfico de barras com os 14 subtestes do WAIS-III — escores ponderados com faixas de classificação',
  instrumentName: 'WAIS-III',
  category: 'Inteligência',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(WAIS_SUBTESTES_SERIES, 'Escore Ponderado', '#0984E3')],
  categories: [
    'Vocabulário', 'Semelhanças', 'Informação', 'Compreensão',
    'Aritmética', 'Dígitos', 'Seq. Números-Letras',
    'Completar Figuras', 'Códigos', 'Cubos',
    'Raciocínio Matricial', 'Arranjo de Figuras',
    'Procurar Símbolos', 'Armar Objetos',
  ].map((label, i) => category(`wais-sub-cat-${i}`, label, WAIS_SUBTESTES_SERIES)),
  referenceLines: [refLine('wais-sub-rl-1', 'Média', 10, '#636E72')],
  referenceRegions: wechslerScaledRegions(),
  yAxisLabel: 'Escore Ponderado',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 2. WAIS-III — Índices Fatoriais ==========

const WAIS_INDICES_SERIES = 'wais-idx-s1'

const WAIS_INDICES_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-wais-indices',
  name: 'WAIS-III — Índices Fatoriais',
  description: 'Gráfico de barras com os 4 índices fatoriais + QI Total do WAIS-III — escores padrão',
  instrumentName: 'WAIS-III',
  category: 'Inteligência',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(WAIS_INDICES_SERIES, 'QI / Índice', '#0984E3')],
  categories: [
    'ICV', 'IOP', 'IMO', 'IVP', 'QIT',
  ].map((label, i) => category(`wais-idx-cat-${i}`, label, WAIS_INDICES_SERIES)),
  referenceLines: [refLine('wais-idx-rl-1', 'Média', 100, '#636E72')],
  referenceRegions: wechslerStandardRegions(),
  yAxisLabel: 'Escore Padrão',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 3. RAVLT — Desempenho ==========

const RAVLT_ESPERADO = 'ravlt-s-esperado'
const RAVLT_MINIMO = 'ravlt-s-minimo'
const RAVLT_OBTIDO = 'ravlt-s-obtido'

// Dados normativos de referência (adultos)
const RAVLT_LABELS = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'A6', 'A7', 'R', 'ALT', 'RET', 'I.P.', 'I.R.']
const RAVLT_ESPERADO_VALS = [7, 9, 11, 12, 13, 6, 11, 11, 13, 17, 1, 0.86, 0.91]
const RAVLT_MINIMO_VALS   = [5, 7, 9, 10, 11, 4, 9, 9, 11, 13, 0.91, 0.68, 0.8]

const RAVLT_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-ravlt',
  name: 'RAVLT — Desempenho',
  description: 'Gráfico de barras com tentativas do RAVLT — valores esperados, mínimos e obtidos pelo paciente',
  instrumentName: 'RAVLT',
  category: 'Memória',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [
    series(RAVLT_ESPERADO, 'Esperado', '#E17055'),
    series(RAVLT_MINIMO, 'Mínimo', '#FDCB6E'),
    series(RAVLT_OBTIDO, 'Obtido', '#00B894'),
  ],
  categories: RAVLT_LABELS.map((label, i) => ({
    id: `ravlt-cat-${i}`,
    label,
    values: {
      [RAVLT_ESPERADO]: RAVLT_ESPERADO_VALS[i],
      [RAVLT_MINIMO]: RAVLT_MINIMO_VALS[i],
      [RAVLT_OBTIDO]: 0,
    },
  })),
  referenceLines: [],
  referenceRegions: [],
  yAxisLabel: 'Escore',
  showValues: true,
  showLegend: true,
  showRegionLegend: false,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 4. FDT — Perfil de Condições ==========

const FDT_SERIES = 'fdt-s1'

const FDT_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-fdt',
  name: 'FDT — Perfil de Condições',
  description: 'Gráfico de barras com as 4 condições do Teste dos Cinco Dígitos — tempo em segundos',
  instrumentName: 'FDT',
  category: 'Atenção / Funções Executivas',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(FDT_SERIES, 'Tempo (s)', '#E17055')],
  categories: [
    'Leitura', 'Contagem', 'Escolha', 'Alternância',
  ].map((label, i) => category(`fdt-cat-${i}`, label, FDT_SERIES)),
  referenceLines: [],
  referenceRegions: [],
  yAxisLabel: 'Tempo (segundos)',
  showValues: true,
  showLegend: false,
  showRegionLegend: false,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 5. BDI-II — Nível de Depressão ==========

const BDI_SERIES = 'bdi-s1'

const BDI_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-bdi-ii',
  name: 'BDI-II — Nível de Depressão',
  description: 'Gráfico de barras com escore total do BDI-II e faixas de gravidade',
  instrumentName: 'BDI-II',
  category: 'Humor e Ansiedade',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(BDI_SERIES, 'Escore Total', '#0984E3')],
  categories: [category('bdi-cat-0', 'BDI-II', BDI_SERIES)],
  referenceLines: [],
  referenceRegions: [
    refRegion('bdi-rr-1', 'Mínima', 0, 13, '#00B89422', '#00B894'),
    refRegion('bdi-rr-2', 'Leve', 14, 19, '#FDCB6E22', '#FDCB6E'),
    refRegion('bdi-rr-3', 'Moderada', 20, 28, '#E1705522', '#E17055'),
    refRegion('bdi-rr-4', 'Grave', 29, 63, '#D6303122', '#D63031'),
  ],
  yAxisLabel: 'Escore Total',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 6. BAI — Nível de Ansiedade ==========

const BAI_SERIES = 'bai-s1'

const BAI_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-bai',
  name: 'BAI — Nível de Ansiedade',
  description: 'Gráfico de barras com escore total do BAI e faixas de gravidade',
  instrumentName: 'BAI',
  category: 'Humor e Ansiedade',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(BAI_SERIES, 'Escore Total', '#6C5CE7')],
  categories: [category('bai-cat-0', 'BAI', BAI_SERIES)],
  referenceLines: [],
  referenceRegions: [
    refRegion('bai-rr-1', 'Mínima', 0, 7, '#00B89422', '#00B894'),
    refRegion('bai-rr-2', 'Leve', 8, 15, '#FDCB6E22', '#FDCB6E'),
    refRegion('bai-rr-3', 'Moderada', 16, 25, '#E1705522', '#E17055'),
    refRegion('bai-rr-4', 'Grave', 26, 63, '#D6303122', '#D63031'),
  ],
  yAxisLabel: 'Escore Total',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 7. SRS-2 — Perfil de Subescalas ==========

const SRS_SERIES = 'srs-s1'

const SRS_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-srs-2',
  name: 'SRS-2 — Perfil de Subescalas',
  description: 'Gráfico de barras com as subescalas do SRS-2 — escores T com faixas de gravidade',
  instrumentName: 'SRS-2',
  category: 'Comportamento Social',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(SRS_SERIES, 'Escore T', '#D63031')],
  categories: [
    'Consciência Social', 'Cognição Social', 'Comunicação Social',
    'Motivação Social', 'Comp. Restritos/Repetitivos', 'SCI', 'Total',
  ].map((label, i) => category(`srs-cat-${i}`, label, SRS_SERIES)),
  referenceLines: [refLine('srs-rl-1', 'Limiar Clínico', 59, '#636E72')],
  referenceRegions: [
    refRegion('srs-rr-1', 'Normal', 30, 59, '#00B89422', '#00B894'),
    refRegion('srs-rr-2', 'Leve', 60, 65, '#FDCB6E22', '#FDCB6E'),
    refRegion('srs-rr-3', 'Moderado', 66, 75, '#E1705522', '#E17055'),
    refRegion('srs-rr-4', 'Grave', 76, 90, '#D6303122', '#D63031'),
  ],
  yAxisLabel: 'Escore T',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 8. ToL-BR — Planejamento Executivo ==========

const TOL_SERIES = 'tol-s1'

const TOL_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-tol-br',
  name: 'ToL-BR — Planejamento Executivo',
  description: 'Gráfico de barras com métricas da Torre de Londres — escores padrão',
  instrumentName: 'ToL-BR',
  category: 'Funções Executivas',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(TOL_SERIES, 'Escore Padrão', '#00B894')],
  categories: [
    'Acertos Totais', 'Movimentos Extras', 'Tempo Iniciação', 'Tempo Execução',
  ].map((label, i) => category(`tol-cat-${i}`, label, TOL_SERIES)),
  referenceLines: [],
  referenceRegions: [],
  yAxisLabel: 'Escore Padrão',
  showValues: true,
  showLegend: false,
  showRegionLegend: false,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 9. Perfil Cognitivo ==========

const COGNITIVO_SERIES = 'cog-s1'

const PERFIL_COGNITIVO_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-perfil-cognitivo',
  name: 'Perfil Cognitivo',
  description: 'Gráfico de barras com domínios cognitivos — resumo geral com faixas de classificação',
  instrumentName: 'Perfil Cognitivo',
  category: 'Geral',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(COGNITIVO_SERIES, 'Escore Padrão', '#0984E3')],
  categories: [
    'Atenção', 'Funções Executivas', 'Memória Verbal', 'Memória Visual',
    'Função Visuoespacial', 'Linguagem', 'Vel. Processamento', 'Inteligência Geral',
  ].map((label, i) => category(`cog-cat-${i}`, label, COGNITIVO_SERIES)),
  referenceLines: [refLine('cog-rl-1', 'Média', 100, '#636E72')],
  referenceRegions: wechslerStandardRegions(),
  yAxisLabel: 'Escore Padrão',
  showValues: true,
  showLegend: false,
  showRegionLegend: true,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== 10. TMT — Partes A e B ==========

const TMT_SERIES = 'tmt-s1'

const TMT_TEMPLATE: ChartTemplate = {
  id: 'chart-tpl-tmt',
  name: 'TMT — Partes A e B',
  description: 'Gráfico de barras com os tempos do Trail Making Test — partes A e B com cutoffs',
  instrumentName: 'TMT',
  category: 'Atenção / Funções Executivas',
  chartType: 'bar',
  displayMode: 'grouped',
  series: [series(TMT_SERIES, 'Tempo (s)', '#E17055')],
  categories: [
    category('tmt-cat-0', 'Parte A', TMT_SERIES),
    category('tmt-cat-1', 'Parte B', TMT_SERIES),
  ],
  referenceLines: [
    refLine('tmt-rl-1', 'Cutoff Parte A', 78, '#D63031'),
    refLine('tmt-rl-2', 'Cutoff Parte B', 273, '#D63031'),
  ],
  referenceRegions: [],
  yAxisLabel: 'Tempo (segundos)',
  showValues: true,
  showLegend: false,
  showRegionLegend: false,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW,
}

// ========== Export ==========

export const DEFAULT_CHART_TEMPLATES: ChartTemplate[] = [
  WAIS_SUBTESTES_TEMPLATE,
  WAIS_INDICES_TEMPLATE,
  RAVLT_TEMPLATE,
  FDT_TEMPLATE,
  BDI_TEMPLATE,
  BAI_TEMPLATE,
  SRS_TEMPLATE,
  TOL_TEMPLATE,
  PERFIL_COGNITIVO_TEMPLATE,
  TMT_TEMPLATE,
]
