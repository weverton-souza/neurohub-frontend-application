# CLAUDE.md — Regras do Projeto NeuroHub Frontend

## Idioma

- UI, labels, mensagens de erro e placeholders: **sempre em português brasileiro**
- Nomes de variáveis, funções, interfaces e tipos: **sempre em inglês**
- Commits: **português brasileiro**, usando conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Nunca incluir `Co-Authored-By` nos commits

## Stack e Versões

- React 19 + TypeScript + Vite
- Tailwind CSS **v3** (não v4)
- Chart.js 4 direto com canvas refs (nunca usar `react-chartjs-2`)
- Plate.js (platejs) para rich text WYSIWYG (bold, itálico, sublinhado, riscado, listas, alinhamento)
- `docx` 9 para geração de .docx in-browser

## Features do Projeto

### Laudos (Relatórios Neuropsicológicos)
- Editor de blocos com drag-and-drop (dnd-kit) e auto-save para localStorage
- 7 tipos de bloco: identification, text, score-table, info-box, chart, references, closing-page
- Sistema de seções derivado dos blocos (não armazenado) com collapse/expand
- Sidebar com árvore de navegação (OutlineTree) e IntersectionObserver para destaque ativo
- Criação a partir de templates (2 padrões: Adulto e Breve) ou do zero
- Versionamento com snapshots manuais e automáticos (máx. 20 por laudo)
- Status com transições: rascunho → em_revisão → finalizado
- Exportação .docx in-browser com header profissional, logo, rodapé com ícones sociais e paginação
- Gráficos Chart.js (bar/line) com modos grouped/separated, linhas e regiões de referência, exportados como PNG no .docx
- Templates de gráfico pré-configurados (10 padrões): WAIS-III Subtestes, WAIS-III Índices, RAVLT Curva, FDT, BDI-II, BAI, SRS-2, ToL-BR, Perfil Cognitivo, TMT
- Seleção de template ao criar gráfico via BlockSelector (flow em 2 steps)
- Salvar gráfico como template customizado com nome, instrumento e categoria
- Rich text WYSIWYG (Plate.js) com bold, itálico, sublinhado, riscado, listas (bullet/numerada), alinhamento (L/C/R/J) nos blocos de texto
- Conteúdo armazenado em Slate JSON (array de nós), com backward compat para HTML legado (auto-conversão no load)
- Itens rotulados (key-value) nos blocos de texto
- Tabelas dinâmicas com colunas nomeadas pelo usuário (score-table)
- Engine de fórmulas v2: classificação por faixa, operações matemáticas (soma, subtração, média), agregações por coluna e linha
- Fórmulas digitáveis nas células (prefixo `=`) com autocomplete de funções, auto-uppercase, e barra de fórmulas
- Referências de célula (A1, B23) e ranges de coluna (A:A) — referências standalone de coluna (A, B) não aceitas
- Cores em fórmulas via sintaxe `@#RRGGBB` — color picker visual com presets, input hex, e slider de intensidade com marcadores (10-90)
- Aplicação em lote de intensidade (lightness) a todas as cores da tabela, mantendo hue de cada uma
- Replicação de fórmulas: ao confirmar com Enter, popup oferece replicar para mesma linha ou coluna com ajuste automático de referências (como Excel)
- Detecção de conflitos: ao replicar sobre células que já possuem fórmula, popup pergunta se quer sobrepor ou manter existentes
- Alinhamento por coluna (esquerda/centro/direita) com toggle no header — headers sempre centralizados
- Salvar tabela como template customizado com nome, instrumento e categoria
- Templates de tabela de escores com fórmulas embutidas: WAIS-III, RAVLT, FDT, BDI-II, BAI, SRS-2, ToL-BR
- FormulaEditor visual para configurar fórmulas por coluna ou célula (sem digitação de expressões)
- Seleção de template ao criar tabela de escores via BlockSelector (flow em 2 steps)
- Valores calculados automaticamente no editor e no export .docx
- `adjustFormulaRefs()` em formula-parser.ts: ajusta referências de célula ao replicar (deltaCol/deltaRow)
- `remapFormulaRefs()` em formula-parser.ts: remapeia referências ao reordenar linhas/colunas (permutação)
- Cell ranges nas fórmulas: sintaxe `A1:A4` e `A1:B3` para intervalos de células (single e multi-coluna)
- Funções SOMA, MEDIA, MIN, MAX, CONT aceitam ranges como argumento (ex: `=SOMA(A1:A4;B1:B4)`)
- Reordenar linhas com drag-and-drop (grip handle no número da linha)
- Reordenar colunas com drag-and-drop (grip handle no header da coluna)
- Fórmulas com referências posicionais (A1, B2, A1:A4, A:A) são remapeadas automaticamente ao reordenar
- Página de encerramento com assinaturas configuráveis (profissional, paciente, mãe, pai, responsável)

### Pacientes
- Cadastro completo: dados pessoais, contato, dados clínicos
- Busca por nome ou CPF com paginação
- Perfil com 6 abas: Dados Pessoais, Contato, Dados Clínicos, Laudos, Notas, Histórico
- Notas clínicas com timestamp
- Timeline de eventos (consulta, retorno, avaliação, laudo, observação) agrupados por mês/ano
- Vínculo com laudos via patientId — criar laudo a partir do paciente pré-preenche o bloco de identificação
- Dados do paciente são copiados para o laudo (não vinculados — edição no laudo não altera o cadastro)

### Formulários de Anamnese
- Construtor de formulários com 8 tipos de campo: short-text, long-text, single-choice, multiple-choice, scale, yes-no, date, section-header
- 3 formulários padrão: Adulto (32 campos), Infantil (29 campos), Breve (7 campos)
- Drag-and-drop para reordenação de campos
- Preview do formulário como o usuário final vê
- Mapeamento de campos para seções de template de laudo (FieldMappingEditor)
- Vínculo com template de laudo (TemplateLinkModal)
- Duplicação de formulários

### Preenchimento de Formulários
- Interface de preenchimento com renderização por tipo de campo (FormFieldRenderer)
- Validação de campos obrigatórios
- Auto-save com debounce
- Status: em_andamento → concluído
- Suporte a pré-preenchimento via paciente

### Geração de Laudo a partir de Respostas
- Pipeline de geração via IA: buildPrompt → generateLaudoFromResponse → parseAIResponse
- Sistema de variáveis com sintaxe {{chave}} resolvidas de dados do paciente e respostas do formulário
- Mapeamento campo→seção com hints para a IA
- Resolução de variáveis (variable-service) em blocos text e info-box

### Configurações Profissionais
- Modal para nome, CRP, especialização, logo (base64)
- Itens de contato configuráveis (Instagram, LinkedIn, Facebook, website, telefone, email)
- Dados usados no header do .docx e no bloco de identificação

### Persistência (localStorage)
- Chaves: neurohub_laudos, neurohub_patients, neurohub_patient_notes, neurohub_patient_events, neurohub_professional, neurohub_templates, neurohub_forms, neurohub_form_responses, neurohub_versions_{laudoId}, neurohub_score_table_templates, neurohub_chart_templates
- CRUD genérico via storage-utils.ts (readFromStorage, writeToStorage, upsertInStorage, deleteFromStorage)
- Sem backend — tudo local

## Próximas Features (roadmap até abril/2026)

### Migração para Backend
- Substituir localStorage por Supabase ou Node — autenticação, persistência remota, sync

### Templates Locked/Unlocked
- Modo template (locked): estrutura fixa, profissional só preenche dados
- Modo livre (unlocked): edição completa como hoje

### Preview e Download em PDF
- Preview do laudo: conversão .docx → PDF via LibreOffice headless no backend
- Download em PDF além do .docx atual

### Acompanhamento do Paciente
- Perguntas configuráveis por paciente (profissional define quais perguntas acompanhar)
- Tela PWA/webview para o paciente: formulário diário com layout limpo
- Rota separada para o paciente (`/p/:id`) com layout sem sidebar/menu do profissional
- Painel da profissional: timeline de respostas + gráficos de evolução
- Resumo por IA: chamada à API Claude para sintetizar dados de acompanhamento

### Tabelas de Escores — Melhorias
- Redimensionar largura das colunas (arrastar borda do header)

### Polish Geral
- Ajustes visuais e de UX para demo na convenção

## Organização de Arquivos

```
src/
  types/index.ts        → todas as interfaces, tipos, constantes e factory functions
  lib/                  → lógica de negócio, utilitários, serviços
  lib/storage-utils.ts  → utilitários genéricos de localStorage
  lib/storage.ts        → CRUD de laudos, pacientes, templates
  lib/block-constants.tsx → labels, cores, ícones e getBlockTitle()
  components/blocks/    → um componente por tipo de bloco
  components/editor/    → componentes do editor (BlockList, BlockSelector, OutlineTree)
  components/ui/        → componentes reutilizáveis (Button, Input, Modal, Select)
  components/layout/    → AppLayout, Sidebar, PageHeader
  components/form-builder/ → componentes do construtor de formulários
  components/form-fill/    → componentes de preenchimento de formulários
  routes/               → páginas (uma por rota)
```

## Regras de Código

### Imports
- Sempre usar alias `@/` para imports (nunca `../` entre diretórios diferentes)
- Ordem: bibliotecas externas > `@/types` > `@/lib/*` > `@/components/*`

### Tipos
- Todas as interfaces e tipos ficam em `src/types/index.ts`
- Nunca definir a mesma interface em dois arquivos — centralizar em `types/`
- Usar `type` para imports de tipos quando possível (`import type { ... }`)

### Funções utilitárias
- Nunca duplicar lógica — se uma função existe em `lib/`, importar de lá
- `getBlockTitle()` fica em `block-constants.tsx` — nunca recriar localmente
- `resolveAnswerDisplay()` fica em `variable-service.ts` — fonte única para exibição de respostas
- localStorage: usar `readFromStorage`, `writeToStorage`, `upsertInStorage`, `deleteFromStorage` de `storage-utils.ts`

### Componentes React
- Componentes funcionais com export default
- Props interface definida no mesmo arquivo, acima do componente
- Sem `React.FC` — usar `function NomeDoComponente(props: Props)`
- Custom `Select` component: `onChange` recebe `(value: string)`, não um event

### Estilo
- Tailwind v3 utility classes (nunca CSS inline ou modules)
- Cores da marca: `brand-*` (configurado no tailwind.config)
- Cores do docx: DARK_BLUE `#1B4F72`, MEDIUM_BLUE `#2E86C1`, LIGHT_BLUE `#D6EAF8`

## Antes de Commitar

1. Rodar `npx tsc --noEmit` — zero erros obrigatório
2. Rodar `npx vite build` — build deve passar
3. Nunca commitar `tsconfig.tsbuildinfo`, `.env`, ou `node_modules`
4. Atualizar o CLAUDE.md: adicionar novas features implementadas em `## Features do Projeto` e remover da `## Próximas Features` o que já foi concluído

## Padrões de Commit

```
feat: descrição curta em português
fix: descrição curta em português
refactor: descrição curta em português
chore: descrição curta em português
```

- Mensagem descritiva no corpo quando necessário
- Branch naming: `feat/nome-curto`, `fix/nome-curto`, `refactor/nome-curto`

## Coisas para Nunca Fazer

- Nunca usar `react-chartjs-2`
- Nunca registrar plugins do Chart.js globalmente no ChartBlock (usar array `plugins` inline)
- Nunca esquecer `columnWidths` ao criar `new Table()` no docx
- Nunca adicionar botão de criação na Sidebar — ela é só navegação
- Nunca usar dark mode (foi experimentado e revertido)
- Nunca adicionar dependências sem perguntar primeiro
- Nunca criar arquivos de documentação (.md) sem ser solicitado
