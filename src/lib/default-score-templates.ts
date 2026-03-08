import type {
  ScoreTableTemplate,
  ScoreTableTemplateColumn,
  ScoreTableTemplateRow,
} from '@/types'

// ========== Fórmulas reutilizáveis ==========

// Classificação Wechsler por percentil — colLetter é a letra da coluna fonte (ex: "D")
const WECHSLER = (colLetter: string) =>
  `=CLASSIFICAR(${colLetter};>=98;"Muito Superior";>=91;"Superior";>=75;"Médio Superior";>=25;"Médio";>=9;"Médio Inferior";>=3;"Limítrofe";"Extremamente Baixo")`

// ========== Helpers ==========

function col(id: string, label: string, formula: ScoreTableTemplateColumn['formula'] = null): ScoreTableTemplateColumn {
  return { id, label, formula }
}

function row(id: string, defaultValues: Record<string, string>): ScoreTableTemplateRow {
  return { id, defaultValues }
}

// ========== WAIS-III ==========
// Colunas: A=Subteste, B=Escore Bruto, C=Escore Ponderado, D=Percentil, E=Classificação

const WAIS_COLS = {
  subteste: 'wais-col-subteste',
  bruto: 'wais-col-bruto',
  ponderado: 'wais-col-ponderado',
  percentil: 'wais-col-percentil',
  classificacao: 'wais-col-classificacao',
}

const WAIS_SUBTESTES = [
  'Vocabulário', 'Semelhanças', 'Informação', 'Compreensão',
  'Aritmética', 'Dígitos', 'Sequência Números-Letras',
  'Completar Figuras', 'Códigos', 'Cubos',
  'Raciocínio Matricial', 'Arranjo de Figuras',
  'Procurar Símbolos', 'Armar Objetos',
]

const WAIS_III_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-wais-iii',
  name: 'WAIS-III',
  description: 'Escala de Inteligência Wechsler para Adultos — subtestes com classificação por percentil',
  instrumentName: 'WAIS-III',
  category: 'Inteligência',
  columns: [
    col(WAIS_COLS.subteste, 'Subteste'),
    col(WAIS_COLS.bruto, 'Escore Bruto'),
    col(WAIS_COLS.ponderado, 'Escore Ponderado'),
    col(WAIS_COLS.percentil, 'Percentil'),
    col(WAIS_COLS.classificacao, 'Classificação', WECHSLER('D')), // D = Percentil
  ],
  rows: WAIS_SUBTESTES.map((nome, i) =>
    row(`wais-row-${i}`, { [WAIS_COLS.subteste]: nome })
  ),
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== RAVLT ==========
// Colunas: A=Tentativa, B=Escore Bruto, C=Percentil, D=Classificação

const RAVLT_COLS = {
  tentativa: 'ravlt-col-tentativa',
  bruto: 'ravlt-col-bruto',
  percentil: 'ravlt-col-percentil',
  classificacao: 'ravlt-col-classificacao',
}

const RAVLT_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-ravlt',
  name: 'RAVLT',
  description: 'Teste de Aprendizagem Auditivo-Verbal de Rey — tentativas com classificação por percentil',
  instrumentName: 'RAVLT',
  category: 'Memória',
  columns: [
    col(RAVLT_COLS.tentativa, 'Tentativa'),
    col(RAVLT_COLS.bruto, 'Escore Bruto'),
    col(RAVLT_COLS.percentil, 'Percentil'),
    col(RAVLT_COLS.classificacao, 'Classificação', WECHSLER('C')), // C = Percentil
  ],
  rows: [
    row('ravlt-row-0', { [RAVLT_COLS.tentativa]: 'A1' }),
    row('ravlt-row-1', { [RAVLT_COLS.tentativa]: 'A2' }),
    row('ravlt-row-2', { [RAVLT_COLS.tentativa]: 'A3' }),
    row('ravlt-row-3', { [RAVLT_COLS.tentativa]: 'A4' }),
    row('ravlt-row-4', { [RAVLT_COLS.tentativa]: 'A5' }),
    // Total A1-A5: soma dos escores brutos das linhas 1-5
    row('ravlt-row-total', {
      [RAVLT_COLS.tentativa]: 'Total A1-A5',
      [RAVLT_COLS.bruto]: '=SOMA(B1;B2;B3;B4;B5)',
    }),
    row('ravlt-row-5', { [RAVLT_COLS.tentativa]: 'B1' }),
    row('ravlt-row-6', { [RAVLT_COLS.tentativa]: 'A6' }),
    row('ravlt-row-7', { [RAVLT_COLS.tentativa]: 'A7' }),
    row('ravlt-row-8', { [RAVLT_COLS.tentativa]: 'Reconhecimento' }),
  ],
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== FDT (Five Digit Test) ==========
// Colunas: A=Etapa, B=Tempo (s), C=Percentil, D=Classificação

const FDT_COLS = {
  etapa: 'fdt-col-etapa',
  tempo: 'fdt-col-tempo',
  percentil: 'fdt-col-percentil',
  classificacao: 'fdt-col-classificacao',
}

const FDT_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-fdt',
  name: 'FDT',
  description: 'Five Digit Test — etapas com tempos e classificação por percentil',
  instrumentName: 'FDT',
  category: 'Atenção',
  columns: [
    col(FDT_COLS.etapa, 'Etapa'),
    col(FDT_COLS.tempo, 'Tempo (s)'),
    col(FDT_COLS.percentil, 'Percentil'),
    col(FDT_COLS.classificacao, 'Classificação', WECHSLER('C')), // C = Percentil
  ],
  rows: [
    row('fdt-row-0', { [FDT_COLS.etapa]: 'Leitura' }),
    row('fdt-row-1', { [FDT_COLS.etapa]: 'Contagem' }),
    row('fdt-row-2', { [FDT_COLS.etapa]: 'Escolha' }),
    row('fdt-row-3', { [FDT_COLS.etapa]: 'Alternância' }),
    // Inibição = Escolha(linha 3) - Leitura(linha 1)
    row('fdt-row-4', {
      [FDT_COLS.etapa]: 'Inibição',
      [FDT_COLS.tempo]: '=SUBTRACAO(B3;B1)',
    }),
    // Flexibilidade = Alternância(linha 4) - Leitura(linha 1)
    row('fdt-row-5', {
      [FDT_COLS.etapa]: 'Flexibilidade',
      [FDT_COLS.tempo]: '=SUBTRACAO(B4;B1)',
    }),
  ],
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== BDI-II (Beck Depression Inventory) ==========
// Colunas: A=Item, B=Escore, C=Classificação

const BDI_COLS = {
  item: 'bdi-col-item',
  escore: 'bdi-col-escore',
  classificacao: 'bdi-col-classificacao',
}

const BDI_CLASSIFICATION = '=CLASSIFICAR(B;>=29;"Grave";>=20;"Moderado";>=14;"Leve";"Mínimo")'

const BDI_ITEMS = Array.from({ length: 21 }, (_, i) => `Item ${i + 1}`)

const BDI_II_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-bdi-ii',
  name: 'BDI-II',
  description: 'Inventário de Depressão de Beck II — itens com soma total e classificação',
  instrumentName: 'BDI-II',
  category: 'Humor',
  columns: [
    col(BDI_COLS.item, 'Item'),
    col(BDI_COLS.escore, 'Escore'),
    col(BDI_COLS.classificacao, 'Classificação'),
  ],
  rows: [
    ...BDI_ITEMS.map((nome, i) =>
      row(`bdi-row-${i}`, { [BDI_COLS.item]: nome })
    ),
    // Linha Total com soma e classificação
    row('bdi-row-total', {
      [BDI_COLS.item]: 'Total',
      [BDI_COLS.escore]: '=SOMA(B:B)',
      [BDI_COLS.classificacao]: BDI_CLASSIFICATION,
    }),
  ],
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== BAI (Beck Anxiety Inventory) ==========
// Colunas: A=Item, B=Escore, C=Classificação

const BAI_COLS = {
  item: 'bai-col-item',
  escore: 'bai-col-escore',
  classificacao: 'bai-col-classificacao',
}

const BAI_CLASSIFICATION = '=CLASSIFICAR(B;>=31;"Grave";>=20;"Moderado";>=11;"Leve";"Mínimo")'

const BAI_ITEMS = Array.from({ length: 21 }, (_, i) => `Item ${i + 1}`)

const BAI_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-bai',
  name: 'BAI',
  description: 'Inventário de Ansiedade de Beck — itens com soma total e classificação',
  instrumentName: 'BAI',
  category: 'Humor',
  columns: [
    col(BAI_COLS.item, 'Item'),
    col(BAI_COLS.escore, 'Escore'),
    col(BAI_COLS.classificacao, 'Classificação'),
  ],
  rows: [
    ...BAI_ITEMS.map((nome, i) =>
      row(`bai-row-${i}`, { [BAI_COLS.item]: nome })
    ),
    row('bai-row-total', {
      [BAI_COLS.item]: 'Total',
      [BAI_COLS.escore]: '=SOMA(B:B)',
      [BAI_COLS.classificacao]: BAI_CLASSIFICATION,
    }),
  ],
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== SRS-2 ==========
// Colunas: A=Escala, B=Escore Bruto, C=Escore T, D=Classificação

const SRS_COLS = {
  escala: 'srs-col-escala',
  bruto: 'srs-col-bruto',
  tscore: 'srs-col-tscore',
  classificacao: 'srs-col-classificacao',
}

const SRS_CLASSIFICATION = '=CLASSIFICAR(C;>=76;"Grave";>=66;"Moderado";>=60;"Leve";"Dentro dos limites normais")'

const SRS_ESCALAS = [
  'Consciência Social',
  'Cognição Social',
  'Comunicação Social',
  'Motivação Social',
  'Maneirismos Restritos/Repetitivos',
  'Total SRS-2',
]

const SRS_2_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-srs-2',
  name: 'SRS-2',
  description: 'Escala de Responsividade Social 2 — escalas com classificação por escore T',
  instrumentName: 'SRS-2',
  category: 'Comportamento Social',
  columns: [
    col(SRS_COLS.escala, 'Escala'),
    col(SRS_COLS.bruto, 'Escore Bruto'),
    col(SRS_COLS.tscore, 'Escore T'),
    col(SRS_COLS.classificacao, 'Classificação', SRS_CLASSIFICATION), // C = Escore T
  ],
  rows: SRS_ESCALAS.map((nome, i) =>
    row(`srs-row-${i}`, { [SRS_COLS.escala]: nome })
  ),
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== ToL-BR ==========
// Colunas: A=Medida, B=Valor, C=Percentil, D=Classificação

const TOL_COLS = {
  medida: 'tol-col-medida',
  valor: 'tol-col-valor',
  percentil: 'tol-col-percentil',
  classificacao: 'tol-col-classificacao',
}

const TOL_BR_TEMPLATE: ScoreTableTemplate = {
  id: 'tpl-tol-br',
  name: 'ToL-BR',
  description: 'Torre de Londres (versão brasileira) — medidas com classificação por percentil',
  instrumentName: 'ToL-BR',
  category: 'Funções Executivas',
  columns: [
    col(TOL_COLS.medida, 'Medida'),
    col(TOL_COLS.valor, 'Valor'),
    col(TOL_COLS.percentil, 'Percentil'),
    col(TOL_COLS.classificacao, 'Classificação', WECHSLER('C')), // C = Percentil
  ],
  rows: [
    row('tol-row-0', { [TOL_COLS.medida]: 'Escore Total' }),
    row('tol-row-1', { [TOL_COLS.medida]: 'Tempo Total' }),
    row('tol-row-2', { [TOL_COLS.medida]: 'Planejamento' }),
    row('tol-row-3', { [TOL_COLS.medida]: 'Execuções Extras' }),
  ],
  isDefault: true,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
}

// ========== Export ==========

export const DEFAULT_SCORE_TABLE_TEMPLATES: ScoreTableTemplate[] = [
  WAIS_III_TEMPLATE,
  RAVLT_TEMPLATE,
  FDT_TEMPLATE,
  BDI_II_TEMPLATE,
  BAI_TEMPLATE,
  SRS_2_TEMPLATE,
  TOL_BR_TEMPLATE,
]
