import { useState, useEffect, useRef, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'

/* ─── Dados das funções ─── */

interface FormulaExample {
  formula: string
  result: string
}

interface FormulaFunc {
  name: string
  description: string
  syntax: string
  examples: FormulaExample[]
}

interface Section {
  id: string
  title: string
  functions?: FormulaFunc[]
}

const MATH_FUNCTIONS: FormulaFunc[] = [
  {
    name: 'SOMA',
    description: 'Soma todos os valores numéricos.',
    syntax: 'SOMA(valor1; valor2; ...) ou SOMA(A1:A4)',
    examples: [
      { formula: '=SOMA(A1:A4)', result: 'Soma das células A1, A2, A3 e A4' },
      { formula: '=SOMA(10;20;30)', result: '60' },
    ],
  },
  {
    name: 'SUBTRACAO',
    description: 'Subtrai o segundo valor do primeiro.',
    syntax: 'SUBTRACAO(valor1; valor2)',
    examples: [
      { formula: '=SUBTRACAO(100;30)', result: '70' },
      { formula: '=SUBTRACAO(A1;B1)', result: 'A1 menos B1' },
    ],
  },
  {
    name: 'MULTIPLICACAO',
    description: 'Multiplica dois valores.',
    syntax: 'MULTIPLICACAO(valor1; valor2)',
    examples: [
      { formula: '=MULTIPLICACAO(5;4)', result: '20' },
      { formula: '=MULTIPLICACAO(A1;2)', result: 'Dobro de A1' },
    ],
  },
  {
    name: 'DIVISAO',
    description: 'Divide o primeiro valor pelo segundo.',
    syntax: 'DIVISAO(dividendo; divisor)',
    examples: [
      { formula: '=DIVISAO(100;4)', result: '25' },
      { formula: '=DIVISAO(A1;B1)', result: 'A1 dividido por B1' },
    ],
  },
  {
    name: 'MEDIA',
    description: 'Calcula a média aritmética dos valores.',
    syntax: 'MEDIA(valor1; valor2; ...) ou MEDIA(A1:A4)',
    examples: [
      { formula: '=MEDIA(A1:A4)', result: 'Média das células A1 a A4' },
      { formula: '=MEDIA(8;10;6)', result: '8' },
    ],
  },
  {
    name: 'MIN',
    description: 'Retorna o menor valor.',
    syntax: 'MIN(valor1; valor2; ...) ou MIN(A1:A4)',
    examples: [
      { formula: '=MIN(A1:A4)', result: 'Menor valor entre A1 e A4' },
      { formula: '=MIN(10;3;7)', result: '3' },
    ],
  },
  {
    name: 'MAX',
    description: 'Retorna o maior valor.',
    syntax: 'MAX(valor1; valor2; ...) ou MAX(A1:A4)',
    examples: [
      { formula: '=MAX(A1:A4)', result: 'Maior valor entre A1 e A4' },
      { formula: '=MAX(10;3;7)', result: '10' },
    ],
  },
  {
    name: 'ABS',
    description: 'Retorna o valor absoluto (sem sinal negativo).',
    syntax: 'ABS(valor)',
    examples: [
      { formula: '=ABS(-5)', result: '5' },
      { formula: '=ABS(A1)', result: 'Valor absoluto de A1' },
    ],
  },
  {
    name: 'ARRED',
    description: 'Arredonda um número para o número de casas decimais especificado.',
    syntax: 'ARRED(valor; casas_decimais)',
    examples: [
      { formula: '=ARRED(3.14159;2)', result: '3.14' },
      { formula: '=ARRED(MEDIA(A1:A4);1)', result: 'Média arredondada para 1 casa' },
    ],
  },
  {
    name: 'PORCENTAGEM',
    description: 'Calcula a porcentagem de uma parte em relação ao total.',
    syntax: 'PORCENTAGEM(parte; total)',
    examples: [
      { formula: '=PORCENTAGEM(25;100)', result: '25' },
      { formula: '=PORCENTAGEM(A1;B1)', result: '(A1 / B1) × 100' },
    ],
  },
]

const LOGIC_FUNCTIONS: FormulaFunc[] = [
  {
    name: 'SE',
    description: 'Retorna um valor se a condição for verdadeira, outro se for falsa.',
    syntax: 'SE(condição; valor_verdadeiro; valor_falso)',
    examples: [
      { formula: '=SE(A1>5;"Alto";"Baixo")', result: '"Alto" se A1 > 5, senão "Baixo"' },
      { formula: '=SE(A1>=7;"Adequado"@#27AE60;"Déficit"@#E74C3C)', result: 'Com cores de fundo' },
    ],
  },
  {
    name: 'E',
    description: 'Retorna VERDADEIRO se todas as condições forem verdadeiras.',
    syntax: 'E(condição1; condição2; ...)',
    examples: [
      { formula: '=E(A1>0;B1>0)', result: 'VERDADEIRO se ambos > 0' },
      { formula: '=SE(E(A1>5;B1>5);"Ambos altos";"Nem todos")', result: 'Combina com SE' },
    ],
  },
  {
    name: 'OU',
    description: 'Retorna VERDADEIRO se qualquer condição for verdadeira.',
    syntax: 'OU(condição1; condição2; ...)',
    examples: [
      { formula: '=OU(A1=0;B1=0)', result: 'VERDADEIRO se algum for 0' },
      { formula: '=SE(OU(A1<3;B1<3);"Atenção";"OK")', result: 'Combina com SE' },
    ],
  },
]

const CLASSIFY_FUNCTIONS: FormulaFunc[] = [
  {
    name: 'CLASSIFICAR',
    description: 'Classifica um valor em faixas usando condições de comparação. Avalia as condições em ordem e retorna o primeiro resultado que corresponder.',
    syntax: 'CLASSIFICAR(valor; condição1; resultado1; condição2; resultado2; ...; resultado_padrão)',
    examples: [
      {
        formula: '=CLASSIFICAR(A1; <=79; "Baixo"; <=119; "Médio"; "Alto")',
        result: '"Baixo" se ≤ 79, "Médio" se ≤ 119, "Alto" para o resto',
      },
      {
        formula: '=CLASSIFICAR(B1; <=69; "Muito Baixo"@#E74C3C; <=79; "Limítrofe"@#E67E22; <=89; "Médio Inferior"@#F39C12; <=109; "Médio"@#27AE60; <=119; "Médio Superior"@#2ECC71; <=129; "Superior"@#3498DB; "Muito Superior"@#9B59B6)',
        result: 'Classificação completa de QI com 7 faixas coloridas',
      },
    ],
  },
]

const COUNT_TEXT_FUNCTIONS: FormulaFunc[] = [
  {
    name: 'CONT',
    description: 'Conta quantos valores não estão vazios.',
    syntax: 'CONT(valor1; valor2; ...) ou CONT(A:A)',
    examples: [
      { formula: '=CONT(A:A)', result: 'Quantidade de células preenchidas na coluna A' },
      { formula: '=CONT(A1:A10)', result: 'Quantidade de valores no intervalo' },
    ],
  },
  {
    name: 'CONT.SE',
    description: 'Conta quantos valores atendem a uma condição.',
    syntax: 'CONT.SE(intervalo; condição)',
    examples: [
      { formula: '=CONT.SE(A:A; >5)', result: 'Quantos valores na coluna A são maiores que 5' },
      { formula: '=CONT.SE(A1:A10; <=3)', result: 'Quantos valores ≤ 3 no intervalo' },
    ],
  },
  {
    name: 'CONCAT',
    description: 'Concatena (junta) valores em um único texto.',
    syntax: 'CONCAT(valor1; valor2; ...)',
    examples: [
      { formula: '=CONCAT("QI: "; A1)', result: '"QI: 105" (se A1 = 105)' },
      { formula: '=CONCAT(ARRED(PORCENTAGEM(A1;B1);0); "%")', result: '"75%" (porcentagem formatada)' },
    ],
  },
]

const SECTIONS: Section[] = [
  { id: 'conceitos', title: 'Conceitos Básicos' },
  { id: 'matematicas', title: 'Funções Matemáticas', functions: MATH_FUNCTIONS },
  { id: 'logicas', title: 'Funções Lógicas', functions: LOGIC_FUNCTIONS },
  { id: 'classificacao', title: 'Classificação', functions: CLASSIFY_FUNCTIONS },
  { id: 'contagem-texto', title: 'Contagem e Texto', functions: COUNT_TEXT_FUNCTIONS },
  { id: 'avancados', title: 'Exemplos Avançados' },
  { id: 'erros', title: 'Erros Comuns' },
]

const ADVANCED_EXAMPLES: FormulaExample[] = [
  {
    formula: '=CLASSIFICAR(B1; <=69; "Muito Baixo"@#E74C3C; <=79; "Limítrofe"@#E67E22; <=89; "Médio Inferior"@#F39C12; <=109; "Médio"@#27AE60; <=119; "Médio Superior"@#2ECC71; <=129; "Superior"@#3498DB; "Muito Superior"@#9B59B6)',
    result: 'Classificação completa de QI com 7 faixas e cores',
  },
  {
    formula: '=ARRED(MEDIA(A1:A10);1)',
    result: 'Média arredondada para 1 casa decimal',
  },
  {
    formula: '=CONCAT(ARRED(PORCENTAGEM(A1;B1);0);"%")',
    result: 'Porcentagem formatada com símbolo %',
  },
  {
    formula: '=SE(A1>=7;"Adequado"@#27AE60;"Déficit"@#E74C3C)',
    result: 'Resultado condicional com cor verde ou vermelha',
  },
  {
    formula: '=SE(E(A1>0;B1>0);MEDIA(A1;B1);"—")',
    result: 'Média apenas se ambos os valores existem',
  },
]

const ERROR_CODES = [
  { code: '#SINTAXE', description: 'Erro de sintaxe na fórmula. Verifique parênteses, ponto-e-vírgulas e nomes de funções.' },
  { code: '#VALOR', description: 'Tipo de valor inválido. Por exemplo, tentar somar um texto não-numérico.' },
  { code: '#DIV/0', description: 'Divisão por zero. O divisor não pode ser 0.' },
  { code: '#REF', description: 'Referência de célula ou coluna inválida. A célula ou coluna referenciada não existe.' },
  { code: '#CICLO', description: 'Referência circular detectada. Uma fórmula não pode referenciar a si mesma.' },
]

/* ─── Componentes internos ─── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 px-2 py-1 text-[10px] font-medium rounded border transition-colors"
      style={
        copied
          ? { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7', color: '#065F46' }
          : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }
      }
    >
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  )
}

function FormulaCard({ func }: { func: FormulaFunc }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-baseline gap-2 mb-1">
        <h4 className="text-sm font-bold text-brand-700">{func.name}</h4>
        <span className="text-xs text-gray-500">{func.description}</span>
      </div>

      <div className="mb-3">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sintaxe</span>
        <div className="mt-0.5 bg-gray-50 rounded-lg px-3 py-1.5 font-mono text-xs text-gray-700">
          {func.syntax}
        </div>
      </div>

      <div className="space-y-2">
        {func.examples.map((ex, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="block bg-brand-50 text-brand-800 rounded px-2 py-1 text-xs font-mono break-all flex-1">
                  {ex.formula}
                </code>
                <CopyButton text={ex.formula} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-2">
                <span className="text-gray-400 mr-1">&rarr;</span>
                {ex.result}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionNav({ activeSection }: { activeSection: string }) {
  return (
    <nav className="space-y-0.5">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`block px-3 py-1.5 text-xs rounded-lg transition-colors ${
            activeSection === s.id
              ? 'bg-brand-100 text-brand-700 font-medium'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {s.title}
        </a>
      ))}
    </nav>
  )
}

/* ─── Componente principal ─── */

export default function FormulaGuide() {
  const [activeSection, setActiveSection] = useState('conceitos')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )

    const sections = document.querySelectorAll('[data-guide-section]')
    sections.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div>
      <PageHeader
        title="Guia de Fórmulas"
        subtitle="Referência completa para tabelas de escores"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar de navegação */}
          <div className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-20">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                Navegação
              </p>
              <SectionNav activeSection={activeSection} />
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* ─── Conceitos Básicos ─── */}
            <section id="conceitos" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conceitos Básicos</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Como usar fórmulas</h3>
                  <p className="text-sm text-gray-600">
                    Toda fórmula começa com o sinal <code className="bg-gray-100 px-1 rounded text-brand-700 font-mono">=</code> seguido
                    do nome da função e seus argumentos entre parênteses. Os argumentos são separados
                    por <code className="bg-gray-100 px-1 rounded text-brand-700 font-mono">;</code> (ponto-e-vírgula).
                  </p>
                  <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700">
                    =NOME_FUNCAO(argumento1; argumento2; ...)
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Referências de célula</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Cada célula é identificada pela letra da coluna + número da linha.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono font-bold text-brand-700">A1</code>
                      <p className="text-[11px] text-gray-500 mt-0.5">Coluna A, linha 1</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono font-bold text-brand-700">B3</code>
                      <p className="text-[11px] text-gray-500 mt-0.5">Coluna B, linha 3</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono font-bold text-brand-700">C12</code>
                      <p className="text-[11px] text-gray-500 mt-0.5">Coluna C, linha 12</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Intervalos de células</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Use <code className="bg-gray-100 px-1 rounded text-brand-700 font-mono">:</code> (dois pontos) para definir um intervalo contínuo de células.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono font-bold text-brand-700">A1:A4</code>
                      <p className="text-[11px] text-gray-500 mt-0.5">Células A1, A2, A3 e A4 (mesma coluna)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono font-bold text-brand-700">A1:C3</code>
                      <p className="text-[11px] text-gray-500 mt-0.5">Retângulo de A1 até C3 (9 células)</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Coluna inteira</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Use a sintaxe <code className="bg-gray-100 px-1 rounded text-brand-700 font-mono">A:A</code> para
                    referenciar todos os valores de uma coluna.
                  </p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 inline-block">
                    <code className="text-xs font-mono font-bold text-brand-700">A:A</code>
                    <span className="text-[11px] text-gray-500 ml-2">Todos os valores da coluna A</span>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Cores</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Adicione <code className="bg-gray-100 px-1 rounded text-brand-700 font-mono">@#RRGGBB</code> após qualquer
                    valor ou texto para aplicar uma cor de fundo à célula.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="bg-brand-50 text-brand-800 rounded px-2 py-1 text-xs font-mono">
                        &quot;Aprovado&quot;@#27AE60
                      </code>
                      <CopyButton text='"Aprovado"@#27AE60' />
                      <span className="text-xs text-gray-400">&rarr;</span>
                      <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#27AE60' }}>
                        Aprovado
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-brand-50 text-brand-800 rounded px-2 py-1 text-xs font-mono">
                        &quot;Reprovado&quot;@#E74C3C
                      </code>
                      <CopyButton text='"Reprovado"@#E74C3C' />
                      <span className="text-xs text-gray-400">&rarr;</span>
                      <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#E74C3C' }}>
                        Reprovado
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">Operadores de comparação</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Usados em CLASSIFICAR, CONT.SE e condições do SE.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { op: '<=', desc: 'Menor ou igual' },
                      { op: '>=', desc: 'Maior ou igual' },
                      { op: '<', desc: 'Menor que' },
                      { op: '>', desc: 'Maior que' },
                      { op: '=', desc: 'Igual a' },
                      { op: '<>', desc: 'Diferente de' },
                    ].map((item) => (
                      <div key={item.op} className="bg-gray-50 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono font-bold text-brand-700">{item.op}</code>
                        <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Funções Matemáticas ─── */}
            <section id="matematicas" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Funções Matemáticas</h2>
              <div className="space-y-3">
                {MATH_FUNCTIONS.map((f) => (
                  <FormulaCard key={f.name} func={f} />
                ))}
              </div>
            </section>

            {/* ─── Funções Lógicas ─── */}
            <section id="logicas" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Funções Lógicas</h2>
              <div className="space-y-3">
                {LOGIC_FUNCTIONS.map((f) => (
                  <FormulaCard key={f.name} func={f} />
                ))}
              </div>
            </section>

            {/* ─── Classificação ─── */}
            <section id="classificacao" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Classificação</h2>
              <div className="space-y-3">
                {CLASSIFY_FUNCTIONS.map((f) => (
                  <FormulaCard key={f.name} func={f} />
                ))}
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">Como funciona o CLASSIFICAR</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  As condições são avaliadas <strong>em ordem</strong>. Quando o valor atende uma condição,
                  o resultado correspondente é retornado e as demais condições são ignoradas.
                  Se nenhuma condição for atendida, o último argumento é usado como valor padrão.
                </p>
                <div className="mt-2 bg-white/60 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <p className="font-mono mb-1">=CLASSIFICAR(85; &lt;=79; &quot;Baixo&quot;; &lt;=119; &quot;Médio&quot;; &quot;Alto&quot;)</p>
                  <p className="text-amber-600">
                    &bull; 85 &le; 79? Não &rarr; pula<br />
                    &bull; 85 &le; 119? Sim &rarr; retorna &quot;Médio&quot;
                  </p>
                </div>
              </div>
            </section>

            {/* ─── Contagem e Texto ─── */}
            <section id="contagem-texto" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contagem e Texto</h2>
              <div className="space-y-3">
                {COUNT_TEXT_FUNCTIONS.map((f) => (
                  <FormulaCard key={f.name} func={f} />
                ))}
              </div>
            </section>

            {/* ─── Exemplos Avançados ─── */}
            <section id="avancados" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Exemplos Avançados</h2>
              <p className="text-sm text-gray-500 mb-4">
                Exemplos práticos para avaliação neuropsicológica — copie e adapte para suas tabelas.
              </p>
              <div className="space-y-3">
                {ADVANCED_EXAMPLES.map((ex, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start gap-2">
                      <code className="block bg-brand-50 text-brand-800 rounded px-3 py-2 text-xs font-mono break-all flex-1">
                        {ex.formula}
                      </code>
                      <CopyButton text={ex.formula} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      <span className="text-gray-400 mr-1">&rarr;</span>
                      {ex.result}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── Erros Comuns ─── */}
            <section id="erros" data-guide-section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Erros Comuns</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {ERROR_CODES.map((err) => (
                  <div key={err.code} className="px-4 py-3 flex items-start gap-3">
                    <code className="shrink-0 bg-red-50 text-red-700 rounded px-2 py-0.5 text-xs font-mono font-bold">
                      {err.code}
                    </code>
                    <p className="text-sm text-gray-600">{err.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Spacer */}
            <div className="h-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
