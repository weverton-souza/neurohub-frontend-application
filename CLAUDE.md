# CLAUDE.md — Regras do Projeto Dox Frontend

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

## Planos do Projeto

> Features implementadas e próximas features estão centralizados em `plans/frontend-plan.md` na raiz do environment.

## Nomenclatura Frontend ↔ Backend

| Frontend | Backend | Nota |
|----------|---------|------|
| Customer | Customer | `data` field é JSONB no backend |
| Report | Report | `customerName`, `customerId` |
| Form | Form | Estrutura similar |
| FormResponse | FormResponse | `customerId`, `customerName`, `generatedReportId` |
| ReportTemplate | ReportTemplate | - |
| ReportVersion | ReportVersion | `reportId`, `customerName` |
| Professional | ProfessionalSettings | Campos top-level (não nested) |

## Próximas Features (roadmap até abril/2026)

### Formulários Públicos (Link de Resposta para Clientes)
- Página pública acessada via URL pré-gerada pelo backend (sem autenticação)
- Rota pública `/forms/{token}` com layout limpo (sem sidebar/auth)
- Profissional gera link com validade configurável, vinculado a um Form + Customer
- Renderiza campos do formulário, valida respostas, envia e exibe confirmação
- Expiração automática: link inválido após tempo limite ou após envio
- API: `GET /public/forms/{token}` (carrega form) e `POST /public/forms/{token}/submit` (envia respostas)

### Templates Locked/Unlocked
- Modo template (locked): estrutura fixa, profissional só preenche dados
- Modo livre (unlocked): edição completa como hoje

### Preview e Download em PDF
- Preview do relatório: conversão .docx → PDF via LibreOffice headless no backend
- Download em PDF além do .docx atual

### Acompanhamento do Cliente
- Perguntas configuráveis por cliente (profissional define quais perguntas acompanhar)
- Tela PWA/webview para o cliente: formulário diário com layout limpo
- Rota separada para o cliente (`/p/:id`) com layout sem sidebar/menu do profissional
- Painel da profissional: timeline de respostas + gráficos de evolução
- Resumo por IA: chamada à API Claude para sintetizar dados de acompanhamento

### Tabelas de Escores — Melhorias
- Redimensionar largura das colunas (arrastar borda do header)

### Polish Geral
- Ajustes visuais e de UX para demo na convenção
- Login: layout centralizado com card glassmorphism (esquerda) + slogan (direita), background SVG com dot pattern radial
- Dot pattern sutil (radial-gradient) no background do ReportEditor e FormBuilder (opacity 0.065)
- DocxPreviewPanel com backgrounds transparentes para exibir dots por trás

## Organização de Arquivos

```
src/
  types/index.ts           → todas as interfaces, tipos, constantes e factory functions
  lib/                     → lógica de negócio, utilitários, serviços
  lib/api/                 → API services (api-client, auth-service, error-handler, *-api.ts)
  lib/block-constants.tsx  → labels, cores, ícones e getBlockTitle()
  lib/report-utils.ts      → criação de relatórios (createEmptyReport, createReportFromCustomer)
  lib/hooks/               → custom hooks reutilizáveis (useAutoSave, useConfirmDelete, usePagination, useClickOutside)
  components/blocks/       → um componente por tipo de bloco
  components/editor/       → componentes do editor (BlockList, BlockSelector, OutlineTree)
  components/ui/           → componentes reutilizáveis (Button, Input, Modal, Select)
  components/layout/       → AppLayout, Sidebar, GlobalTopBar, PageHeader
  components/form-builder/ → componentes do construtor de formulários
  components/form-fill/    → componentes de preenchimento de formulários
  routes/                  → páginas (uma por rota)
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
- API calls: usar os serviços em `lib/api/*-api.ts` — nunca chamar axios diretamente
- Criação de relatórios: usar `createEmptyReport()` e `createReportFromCustomer()` de `report-utils.ts` (async)
- Custom hooks reutilizáveis em `lib/hooks/`: `useAutoSave`, `useConfirmDelete`, `usePagination`, `useClickOutside`
- Error handling: usar `useError()` de `ErrorContext` — nunca `alert()` para erros de API

### Componentes React
- Componentes funcionais com export default
- Props interface definida no mesmo arquivo, acima do componente
- Sem `React.FC` — usar `function NomeDoComponente(props: Props)`
- Custom `Select` component: `onChange` recebe `(value: string)`, não um event

### Estilo
- Tailwind v3 utility classes (nunca CSS inline ou modules)
- Design tokens centralizados em `src/styles/design-tokens.css` (CSS custom properties)
- Cores da marca (azul Apple): `brand-*` via `--color-blue-*` (ex: brand-500 = `#007AFF`)
- Cinzas quentes Apple: `gray-*` via `--color-gray-*` (ex: gray-100 = `#F5F5F7`)
- Aliases semânticos: `surface`, `surface-card`, `surface-hover`
- Sombras customizadas: `shadow-xs`, `shadow-card`, `shadow-dropdown`, `shadow-modal`
- Cores do docx: DARK_BLUE `#163A5F`, MEDIUM_BLUE `#1E5F8C`, LIGHT_BLUE `#D6E8F5`
- Cores de status: success `#34C759`, warning `#FF9500`, danger `#FF3B30`
- Font stack: Inter → -apple-system → Segoe UI → system-ui

## Antes de Commitar

1. Rodar `npx tsc --noEmit` — zero erros obrigatório
2. Rodar `npx vite build` — build deve passar
3. Nunca commitar `tsconfig.tsbuildinfo`, `.env`, ou `node_modules`
4. Atualizar `plans/frontend-plan.md`: adicionar novas features implementadas e remover da `## Próximas Features` o que já foi concluído
5. Se novos arquivos foram criados, atualizar `plans/frontend-architecture.md` com os novos arquivos na árvore

## Padrões de Commit

```
feat: descrição curta em português
fix: descrição curta em português
refactor: descrição curta em português
chore: descrição curta em português
```

- Mensagem descritiva no corpo quando necessário
- Branch naming: `feat/nome-curto`, `fix/nome-curto`, `refactor/nome-curto`

## Fluxo Git

- **Nunca usar git worktree** — editar sempre no repo principal
- Antes de começar: `git pull origin main`
- Criar branch local: `git checkout -b feat/nome-curto`
- Trabalhar, commitar, push, PR, merge
- O dev server roda no repo principal — worktrees causam descompasso entre código editado e código servido

## Coisas para Nunca Fazer

- Nunca usar git worktree
- Nunca usar `react-chartjs-2`
- Nunca registrar plugins do Chart.js globalmente no ChartBlock (usar array `plugins` inline)
- Nunca esquecer `columnWidths` ao criar `new Table()` no docx
- Nunca adicionar botão de criação na Sidebar — ela é só navegação
- Nunca usar dark mode (foi experimentado e revertido)
- Nunca adicionar dependências sem perguntar primeiro
- Nunca criar arquivos de documentação (.md) sem ser solicitado
