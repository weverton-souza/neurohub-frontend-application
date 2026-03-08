import type { ScoreTableData } from '@/types'

// ========== Tokens ==========

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'FUNCTION'
  | 'CELL_REF'      // A1, B3, AA5
  | 'CELL_RANGE'    // A1:A4, B2:C5
  | 'COL_RANGE'     // A:A, B:B (entire column)
  | 'SEMICOLON'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMPARISON'    // >= <= > < = <>
  | 'PLUS'
  | 'MINUS'
  | 'MULT'
  | 'DIV'
  | 'COLOR'         // @#RRGGBB
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  numValue?: number
  endCol?: string   // para CELL_RANGE: coluna final
  endRow?: number   // para CELL_RANGE: linha final
}

// ========== Funções conhecidas ==========

export const FORMULA_FUNCTIONS = [
  'SOMA', 'SUBTRACAO', 'MULTIPLICACAO', 'DIVISAO', 'MEDIA',
  'MIN', 'MAX', 'ABS', 'ARRED', 'PORCENTAGEM',
  'SE', 'E', 'OU', 'CLASSIFICAR',
  'CONT', 'CONT.SE', 'CONCAT',
] as const

const FUNCTION_SET = new Set<string>(FORMULA_FUNCTIONS)

// ========== AST ==========

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'cellRef'; col: string; row: number }
  | { type: 'cellRange'; startCol: string; startRow: number; endCol: string; endRow: number }
  | { type: 'colRange'; col: string }
  | { type: 'functionCall'; name: string; args: ASTNode[] }
  | { type: 'binaryOp'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'comparison'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'thresholdPair'; op: string; value: ASTNode }
  | { type: 'colorAnnotation'; expr: ASTNode; color: string }

// ========== Erros ==========

export class FormulaError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

// ========== Helpers ==========

/** Converte letra de coluna para índice 0-based: A→0, B→1, Z→25, AA→26 */
export function letterToIndex(letters: string): number {
  let result = 0
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64)
  }
  return result - 1
}

/** Converte índice 0-based para letra(s) de coluna: 0→A, 1→B, 25→Z, 26→AA */
export function indexToLetter(index: number): string {
  let result = ''
  let n = index + 1
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

function isLetter(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

/**
 * Ajusta referências de célula (A1, B23) numa fórmula.
 * - deltaCol: deslocamento de coluna (ex: +1 → A vira B)
 * - deltaRow: deslocamento de linha (ex: +1 → 1 vira 2)
 * Preserva: strings entre "", cores @#RRGGBB, nomes de função, COL_RANGE (A:A).
 */
export function adjustFormulaRefs(formula: string, deltaCol: number, deltaRow: number): string {
  let result = ''
  let i = 0
  const len = formula.length

  while (i < len) {
    // String literal — copiar sem alterar
    if (formula[i] === '"') {
      result += '"'
      i++
      while (i < len && formula[i] !== '"') {
        result += formula[i]
        i++
      }
      if (i < len) { result += '"'; i++ }
      continue
    }

    // Sequência de letras
    if (isLetter(formula[i])) {
      let letters = ''
      const start = i
      while (i < len && isLetter(formula[i])) {
        letters += formula[i]
        i++
      }
      const upper = letters.toUpperCase()

      // Seguido por dígitos → referência de célula ou cell range → ajustar
      if (i < len && isDigit(formula[i])) {
        let digits = ''
        while (i < len && isDigit(formula[i])) {
          digits += formula[i]
          i++
        }

        // Peek para ':' + letras + dígitos → cell range (A1:A4)
        if (i < len && formula[i] === ':') {
          let j = i + 1
          let endLetters = ''
          while (j < len && isLetter(formula[j])) {
            endLetters += formula[j]
            j++
          }
          if (endLetters.length > 0 && j < len && isDigit(formula[j])) {
            let endDigits = ''
            while (j < len && isDigit(formula[j])) {
              endDigits += formula[j]
              j++
            }
            const startColIdx = letterToIndex(upper) + deltaCol
            const endColIdx = letterToIndex(endLetters.toUpperCase()) + deltaCol
            const startRowNum = parseInt(digits, 10) + deltaRow
            const endRowNum = parseInt(endDigits, 10) + deltaRow
            if (startColIdx >= 0 && endColIdx >= 0 && startRowNum >= 1 && endRowNum >= 1) {
              result += indexToLetter(startColIdx) + startRowNum + ':' + indexToLetter(endColIdx) + endRowNum
            } else {
              result += upper + digits + ':' + endLetters + endDigits
            }
            i = j
            continue
          }
        }

        const colIdx = letterToIndex(upper) + deltaCol
        const rowNum = parseInt(digits, 10) + deltaRow
        if (colIdx >= 0 && rowNum >= 1) {
          result += indexToLetter(colIdx) + rowNum
        } else {
          result += upper + digits
        }
        continue
      }

      // Seguido por ':' + mesmas letras → COL_RANGE → manter
      if (i < len && formula[i] === ':') {
        const afterColon = formula.slice(i + 1, i + 1 + letters.length).toUpperCase()
        if (afterColon === upper) {
          result += formula.slice(start, i + 1 + letters.length)
          i += 1 + letters.length
          continue
        }
      }

      // Nome de função ou outro identificador → manter como está
      result += formula.slice(start, i)
      continue
    }

    // Outros caracteres
    result += formula[i]
    i++
  }

  return result
}

/**
 * Remapeia referências de célula e coluna numa fórmula usando mappings de permutação.
 * Usado ao reordenar linhas/colunas para manter fórmulas apontando para os dados corretos.
 * - colMap: old col index (0-based) → new col index
 * - rowMap: old row number (1-based) → new row number
 * Preserva: strings entre "", cores @#RRGGBB, nomes de função.
 */
export function remapFormulaRefs(
  formula: string,
  colMap: Map<number, number>,
  rowMap: Map<number, number>,
): string {
  let result = ''
  let i = 0
  const len = formula.length

  while (i < len) {
    // String literal — copiar sem alterar
    if (formula[i] === '"') {
      result += '"'
      i++
      while (i < len && formula[i] !== '"') {
        result += formula[i]
        i++
      }
      if (i < len) { result += '"'; i++ }
      continue
    }

    // Sequência de letras
    if (isLetter(formula[i])) {
      let letters = ''
      const start = i
      while (i < len && isLetter(formula[i])) {
        letters += formula[i]
        i++
      }
      const upper = letters.toUpperCase()

      // Seguido por dígitos → referência de célula ou cell range → remapear
      if (i < len && isDigit(formula[i])) {
        let digits = ''
        while (i < len && isDigit(formula[i])) {
          digits += formula[i]
          i++
        }

        // Peek para ':' + letras + dígitos → cell range (A1:A4)
        if (i < len && formula[i] === ':') {
          let j = i + 1
          let endLetters = ''
          while (j < len && isLetter(formula[j])) {
            endLetters += formula[j]
            j++
          }
          if (endLetters.length > 0 && j < len && isDigit(formula[j])) {
            let endDigits = ''
            while (j < len && isDigit(formula[j])) {
              endDigits += formula[j]
              j++
            }
            const oldStartCol = letterToIndex(upper)
            const oldEndCol = letterToIndex(endLetters.toUpperCase())
            const oldStartRow = parseInt(digits, 10)
            const oldEndRow = parseInt(endDigits, 10)
            const newStartCol = colMap.get(oldStartCol) ?? oldStartCol
            const newEndCol = colMap.get(oldEndCol) ?? oldEndCol
            const newStartRow = rowMap.get(oldStartRow) ?? oldStartRow
            const newEndRow = rowMap.get(oldEndRow) ?? oldEndRow
            result += indexToLetter(newStartCol) + newStartRow + ':' + indexToLetter(newEndCol) + newEndRow
            i = j
            continue
          }
        }

        const oldColIdx = letterToIndex(upper)
        const oldRowNum = parseInt(digits, 10)
        const newColIdx = colMap.get(oldColIdx) ?? oldColIdx
        const newRowNum = rowMap.get(oldRowNum) ?? oldRowNum
        result += indexToLetter(newColIdx) + newRowNum
        continue
      }

      // Seguido por ':' + mesmas letras → COL_RANGE → remapear coluna
      if (i < len && formula[i] === ':') {
        const afterColon = formula.slice(i + 1, i + 1 + letters.length).toUpperCase()
        if (afterColon === upper) {
          const oldColIdx = letterToIndex(upper)
          const newColIdx = colMap.get(oldColIdx) ?? oldColIdx
          const newLetter = indexToLetter(newColIdx)
          result += newLetter + ':' + newLetter
          i += 1 + letters.length
          continue
        }
      }

      // Nome de função ou outro identificador → manter como está
      result += formula.slice(start, i)
      continue
    }

    // Outros caracteres
    result += formula[i]
    i++
  }

  return result
}

// ========== Tokenizer ==========

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const len = input.length

  while (i < len) {
    const ch = input[i]

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    // String literal "..."
    if (ch === '"') {
      i++
      let str = ''
      while (i < len && input[i] !== '"') {
        str += input[i]
        i++
      }
      if (i >= len) throw new FormulaError('#SINTAXE', 'String não fechada')
      i++ // skip closing "
      tokens.push({ type: 'STRING', value: str })
      continue
    }

    // Semicolon
    if (ch === ';') {
      tokens.push({ type: 'SEMICOLON', value: ';' })
      i++
      continue
    }

    // Parentheses
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue }

    // Comparison operators (must check multi-char before single-char)
    if (ch === '>' && i + 1 < len && input[i + 1] === '=') {
      tokens.push({ type: 'COMPARISON', value: '>=' }); i += 2; continue
    }
    if (ch === '<' && i + 1 < len && input[i + 1] === '=') {
      tokens.push({ type: 'COMPARISON', value: '<=' }); i += 2; continue
    }
    if (ch === '<' && i + 1 < len && input[i + 1] === '>') {
      tokens.push({ type: 'COMPARISON', value: '<>' }); i += 2; continue
    }
    if (ch === '>') { tokens.push({ type: 'COMPARISON', value: '>' }); i++; continue }
    if (ch === '<') { tokens.push({ type: 'COMPARISON', value: '<' }); i++; continue }
    if (ch === '=') { tokens.push({ type: 'COMPARISON', value: '=' }); i++; continue }

    // Arithmetic operators
    if (ch === '+') { tokens.push({ type: 'PLUS', value: '+' }); i++; continue }
    if (ch === '-') {
      // Negative number: - followed by digit, and previous token is not a value
      const prev = tokens[tokens.length - 1]
      const prevIsValue = prev && (prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'CELL_REF' || prev.type === 'COL_RANGE' || prev.type === 'STRING')
      if (!prevIsValue && i + 1 < len && isDigit(input[i + 1])) {
        // Parse as negative number
        i++
        let num = '-'
        while (i < len && (isDigit(input[i]) || input[i] === '.')) {
          num += input[i]
          i++
        }
        tokens.push({ type: 'NUMBER', value: num, numValue: parseFloat(num) })
        continue
      }
      tokens.push({ type: 'MINUS', value: '-' }); i++; continue
    }
    if (ch === '*') { tokens.push({ type: 'MULT', value: '*' }); i++; continue }
    if (ch === '/') { tokens.push({ type: 'DIV', value: '/' }); i++; continue }

    // Number
    if (isDigit(ch) || ch === '.') {
      let num = ''
      while (i < len && (isDigit(input[i]) || input[i] === '.')) {
        num += input[i]
        i++
      }
      tokens.push({ type: 'NUMBER', value: num, numValue: parseFloat(num) })
      continue
    }

    // Identifier: function name or column/cell reference
    if (isLetter(ch) || ch === '_') {
      let ident = ''

      // Read letters only first
      while (i < len && isLetter(input[i])) {
        ident += input[i]
        i++
      }

      // Check for dot (CONT.SE)
      if (i < len && input[i] === '.' && !isDigit(input[i + 1] ?? '')) {
        let fullIdent = ident + '.'
        i++
        while (i < len && isLetter(input[i])) {
          fullIdent += input[i]
          i++
        }
        const upper = fullIdent.toUpperCase()
        if (FUNCTION_SET.has(upper)) {
          tokens.push({ type: 'FUNCTION', value: upper })
          continue
        }
        throw new FormulaError('#SINTAXE', `Função desconhecida: ${fullIdent}`)
      }

      const upper = ident.toUpperCase()

      // Followed by digit → cell reference (A1, B23, AA5) or cell range (A1:A4, B2:C5)
      if (i < len && isDigit(input[i])) {
        let num = ''
        while (i < len && isDigit(input[i])) {
          num += input[i]
          i++
        }

        // Peek for ':' followed by letters+digits → cell range (A1:A4)
        if (i < len && input[i] === ':') {
          let j = i + 1
          let endLetters = ''
          while (j < len && isLetter(input[j])) {
            endLetters += input[j]
            j++
          }
          if (endLetters.length > 0 && j < len && isDigit(input[j])) {
            let endNum = ''
            while (j < len && isDigit(input[j])) {
              endNum += input[j]
              j++
            }
            tokens.push({
              type: 'CELL_RANGE',
              value: upper,
              numValue: parseInt(num, 10),
              endCol: endLetters.toUpperCase(),
              endRow: parseInt(endNum, 10),
            })
            i = j
            continue
          }
        }

        tokens.push({ type: 'CELL_REF', value: upper, numValue: parseInt(num, 10) })
        continue
      }

      // Followed by ':' + same letters → column range (A:A, B:B)
      if (i < len && input[i] === ':') {
        const afterColon = input.slice(i + 1, i + 1 + ident.length).toUpperCase()
        if (afterColon === upper) {
          i += 1 + ident.length
          tokens.push({ type: 'COL_RANGE', value: upper })
          continue
        }
      }

      // Followed by '(' and is known function → function call
      if (i < len && input[i] === '(' && FUNCTION_SET.has(upper)) {
        tokens.push({ type: 'FUNCTION', value: upper })
        continue
      }

      // Just letters, not followed by digit or '(' → erro
      // Referências devem sempre ter número da linha (ex: A1, B23)
      throw new FormulaError('#SINTAXE', `Referência inválida: "${ident}" — use ${upper}1, ${upper}2, etc.`)
    }

    // Color annotation @#RRGGBB
    if (ch === '@' && i + 1 < len && input[i + 1] === '#') {
      let hex = '#'
      i += 2
      for (let j = 0; j < 6 && i < len; j++, i++) {
        const hc = input[i].toUpperCase()
        if (!((hc >= '0' && hc <= '9') || (hc >= 'A' && hc <= 'F'))) {
          throw new FormulaError('#SINTAXE', 'Cor inválida: use @#RRGGBB')
        }
        hex += hc
      }
      if (hex.length !== 7) throw new FormulaError('#SINTAXE', 'Cor inválida: use @#RRGGBB')
      tokens.push({ type: 'COLOR', value: hex })
      continue
    }

    throw new FormulaError('#SINTAXE', `Caractere inesperado: ${ch}`)
  }

  tokens.push({ type: 'EOF', value: '' })
  return tokens
}

// ========== Parser ==========

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const token = this.tokens[this.pos]
    this.pos++
    return token
  }

  private expect(type: TokenType): Token {
    const token = this.peek()
    if (token.type !== type) {
      throw new FormulaError('#SINTAXE', `Esperado ${type}, encontrado ${token.type} (${token.value})`)
    }
    return this.advance()
  }

  parse(): ASTNode {
    const node = this.parseExpression()
    if (this.peek().type !== 'EOF') {
      throw new FormulaError('#SINTAXE', `Tokens inesperados após expressão`)
    }
    return node
  }

  private parseExpression(): ASTNode {
    return this.parseComparison()
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive()

    while (this.peek().type === 'COMPARISON') {
      const op = this.advance().value
      const right = this.parseAdditive()
      left = { type: 'comparison', op, left, right }
    }

    return left
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative()

    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.advance().value
      const right = this.parseMultiplicative()
      left = { type: 'binaryOp', op, left, right }
    }

    return left
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parsePrimary()

    while (this.peek().type === 'MULT' || this.peek().type === 'DIV') {
      const op = this.advance().value
      const right = this.parsePrimary()
      left = { type: 'binaryOp', op, left, right }
    }

    return left
  }

  private parsePrimary(): ASTNode {
    const token = this.peek()
    let node: ASTNode

    // Number
    if (token.type === 'NUMBER') {
      this.advance()
      node = { type: 'number', value: token.numValue! }
    }

    // String
    else if (token.type === 'STRING') {
      this.advance()
      node = { type: 'string', value: token.value }
    }

    // Cell reference (A1, B3)
    else if (token.type === 'CELL_REF') {
      this.advance()
      node = { type: 'cellRef', col: token.value, row: token.numValue! }
    }

    // Cell range (A1:A4, B2:C5)
    else if (token.type === 'CELL_RANGE') {
      this.advance()
      node = { type: 'cellRange', startCol: token.value, startRow: token.numValue!, endCol: token.endCol!, endRow: token.endRow! }
    }

    // Column range (A:A, B:B)
    else if (token.type === 'COL_RANGE') {
      this.advance()
      node = { type: 'colRange', col: token.value }
    }

    // Threshold pair (>=N, <=N, >N, <N, =N) inside CLASSIFICAR args
    else if (token.type === 'COMPARISON') {
      const op = this.advance().value
      const valueNode = this.parsePrimary()
      node = { type: 'thresholdPair', op, value: valueNode }
    }

    // Function call
    else if (token.type === 'FUNCTION') {
      const name = this.advance().value
      this.expect('LPAREN')
      const args: ASTNode[] = []

      if (this.peek().type !== 'RPAREN') {
        args.push(this.parseExpression())
        while (this.peek().type === 'SEMICOLON') {
          this.advance() // skip ;
          args.push(this.parseExpression())
        }
      }

      this.expect('RPAREN')
      node = { type: 'functionCall', name, args }
    }

    // Parenthesized expression
    else if (token.type === 'LPAREN') {
      this.advance()
      const expr = this.parseExpression()
      this.expect('RPAREN')
      node = expr
    }

    else {
      throw new FormulaError('#SINTAXE', `Token inesperado: ${token.type} (${token.value})`)
    }

    // Postfix color annotation: "valor"@#RRGGBB
    if (this.peek().type === 'COLOR') {
      const colorToken = this.advance()
      node = { type: 'colorAnnotation', expr: node, color: colorToken.value }
    }

    return node
  }
}

// ========== Evaluador ==========

export interface FormulaContext {
  data: ScoreTableData
  rowId: string
  depth: number
  resultColor?: string
}

const MAX_DEPTH = 10

type FormulaValue = number | string | boolean | number[]

function toNumber(val: FormulaValue): number {
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return val ? 1 : 0
  if (Array.isArray(val)) throw new FormulaError('#VALOR', 'Esperado número, recebido array')
  const n = parseFloat(val)
  if (isNaN(n)) throw new FormulaError('#VALOR', `Não é um número: ${val}`)
  return n
}

function toNumberSafe(val: FormulaValue): number | null {
  try {
    return toNumber(val)
  } catch {
    return null
  }
}

function toString(val: FormulaValue): string {
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(2)
  }
  return String(val)
}

function toBoolean(val: FormulaValue): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val !== 0
  if (typeof val === 'string') return val !== '' && val !== '0'
  return false
}

function flattenNumbers(val: FormulaValue): number[] {
  if (Array.isArray(val)) return val
  return [toNumber(val)]
}

/** Detecta se um valor de célula é uma fórmula (prefixo =) */
export function isFormula(value: string): boolean {
  if (!value) return false
  return value.trim().startsWith('=')
}

/** Resolve a coluna pelo índice (letra → coluna) */
function getColumnByLetterIndex(data: ScoreTableData, colLetters: string): { col: typeof data.columns[number]; colId: string } {
  const idx = letterToIndex(colLetters)
  if (idx < 0 || idx >= data.columns.length) {
    throw new FormulaError('#REF', `Coluna ${colLetters} não existe`)
  }
  const col = data.columns[idx]
  return { col, colId: col.id }
}

/** Resolve o valor de uma célula específica, avaliando recursivamente */
function resolveCellValue(
  ctx: FormulaContext,
  colId: string,
  targetRowId: string,
): FormulaValue {
  const col = ctx.data.columns.find(c => c.id === colId)
  if (!col) throw new FormulaError('#REF', 'Coluna não encontrada')

  const row = ctx.data.rows.find(r => r.id === targetRowId)
  if (!row) throw new FormulaError('#REF', 'Linha não encontrada')

  const rawValue = row.values[col.id] ?? ''

  // Se o valor da célula é uma fórmula, avaliar recursivamente
  if (isFormula(rawValue)) {
    if (ctx.depth >= MAX_DEPTH) throw new FormulaError('#CICLO', 'Referência circular detectada')
    const result = evaluateText(rawValue, targetRowId, ctx.data, ctx.depth + 1)
    const num = parseFloat(result)
    return isNaN(num) ? result : num
  }

  // Se a célula está vazia e a coluna tem fórmula default
  if (rawValue === '' && col.formula) {
    if (ctx.depth >= MAX_DEPTH) throw new FormulaError('#CICLO', 'Referência circular detectada')
    const result = evaluateText(col.formula, targetRowId, ctx.data, ctx.depth + 1)
    const num = parseFloat(result)
    return isNaN(num) ? result : num
  }

  // Valor raw
  if (rawValue === '') return ''
  const num = parseFloat(rawValue)
  return isNaN(num) ? rawValue : num
}

/** Coleta todos os valores numéricos de uma coluna (exceto linha atual e fórmulas) */
function resolveColumnAll(ctx: FormulaContext, colId: string): number[] {
  const col = ctx.data.columns.find(c => c.id === colId)
  if (!col) throw new FormulaError('#REF', 'Coluna não encontrada')

  const values: number[] = []
  for (const row of ctx.data.rows) {
    if (row.id === ctx.rowId) continue // Pular linha atual

    const rawValue = row.values[col.id] ?? ''
    if (isFormula(rawValue)) continue // Pular células com fórmula
    if (rawValue === '' && col.formula) continue // Pular células que usam fórmula da coluna

    if (rawValue.trim() === '') continue
    const num = parseFloat(rawValue)
    if (!isNaN(num)) values.push(num)
  }

  return values
}

function evaluateNode(node: ASTNode, ctx: FormulaContext): FormulaValue {
  switch (node.type) {
    case 'number':
      return node.value

    case 'string':
      return node.value

    case 'cellRef': {
      const { colId } = getColumnByLetterIndex(ctx.data, node.col)
      const rowIndex = node.row - 1 // 1-based → 0-based
      if (rowIndex < 0 || rowIndex >= ctx.data.rows.length) {
        throw new FormulaError('#REF', `Linha ${node.row} não existe`)
      }
      return resolveCellValue(ctx, colId, ctx.data.rows[rowIndex].id)
    }

    case 'cellRange': {
      const startColIdx = letterToIndex(node.startCol)
      const endColIdx = letterToIndex(node.endCol)
      if (startColIdx > endColIdx) throw new FormulaError('#REF', 'Intervalo de colunas inválido')
      if (node.startRow > node.endRow) throw new FormulaError('#REF', 'Intervalo de linhas inválido')

      const values: number[] = []
      for (let ci = startColIdx; ci <= endColIdx; ci++) {
        if (ci < 0 || ci >= ctx.data.columns.length) {
          throw new FormulaError('#REF', `Coluna ${indexToLetter(ci)} não existe`)
        }
        const col = ctx.data.columns[ci]
        for (let ri = node.startRow - 1; ri <= node.endRow - 1; ri++) {
          if (ri < 0 || ri >= ctx.data.rows.length) {
            throw new FormulaError('#REF', `Linha ${ri + 1} não existe`)
          }
          const val = resolveCellValue(ctx, col.id, ctx.data.rows[ri].id)
          const num = toNumberSafe(val)
          if (num !== null) values.push(num)
        }
      }
      return values
    }

    case 'colRange': {
      const { colId } = getColumnByLetterIndex(ctx.data, node.col)
      return resolveColumnAll(ctx, colId)
    }

    case 'colorAnnotation': {
      const val = evaluateNode(node.expr, ctx)
      ctx.resultColor = node.color
      return val
    }

    case 'thresholdPair':
      return evaluateNode(node.value, ctx)

    case 'binaryOp': {
      const left = toNumber(evaluateNode(node.left, ctx))
      const right = toNumber(evaluateNode(node.right, ctx))
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/':
          if (right === 0) throw new FormulaError('#DIV/0', 'Divisão por zero')
          return left / right
        default: throw new FormulaError('#SINTAXE', `Operador desconhecido: ${node.op}`)
      }
    }

    case 'comparison': {
      const left = evaluateNode(node.left, ctx)
      const right = evaluateNode(node.right, ctx)
      const leftNum = toNumberSafe(left)
      const rightNum = toNumberSafe(right)

      if (leftNum !== null && rightNum !== null) {
        switch (node.op) {
          case '>=': return leftNum >= rightNum
          case '<=': return leftNum <= rightNum
          case '>': return leftNum > rightNum
          case '<': return leftNum < rightNum
          case '=': return leftNum === rightNum
          case '<>': return leftNum !== rightNum
          default: return false
        }
      }

      const leftStr = toString(left)
      const rightStr = toString(right)
      switch (node.op) {
        case '=': return leftStr === rightStr
        case '<>': return leftStr !== rightStr
        default: return leftStr.localeCompare(rightStr) >= 0
      }
    }

    case 'functionCall':
      return evaluateFunction(node.name, node.args, ctx)

    default:
      throw new FormulaError('#SINTAXE', 'Nó AST desconhecido')
  }
}

// ========== Funções ==========

function evaluateFunction(name: string, argNodes: ASTNode[], ctx: FormulaContext): FormulaValue {
  switch (name) {
    case 'SOMA': {
      const nums: number[] = []
      for (const arg of argNodes) {
        const val = evaluateNode(arg, ctx)
        nums.push(...flattenNumbers(val))
      }
      return nums.reduce((a, b) => a + b, 0)
    }

    case 'SUBTRACAO': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'SUBTRACAO requer 2 argumentos')
      const a = toNumber(evaluateNode(argNodes[0], ctx))
      const b = toNumber(evaluateNode(argNodes[1], ctx))
      return a - b
    }

    case 'MULTIPLICACAO': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'MULTIPLICACAO requer 2 argumentos')
      const a = toNumber(evaluateNode(argNodes[0], ctx))
      const b = toNumber(evaluateNode(argNodes[1], ctx))
      return a * b
    }

    case 'DIVISAO': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'DIVISAO requer 2 argumentos')
      const a = toNumber(evaluateNode(argNodes[0], ctx))
      const b = toNumber(evaluateNode(argNodes[1], ctx))
      if (b === 0) throw new FormulaError('#DIV/0', 'Divisão por zero')
      return a / b
    }

    case 'MEDIA': {
      const nums: number[] = []
      for (const arg of argNodes) {
        const val = evaluateNode(arg, ctx)
        nums.push(...flattenNumbers(val))
      }
      if (nums.length === 0) throw new FormulaError('#VALOR', 'MEDIA sem valores')
      return nums.reduce((a, b) => a + b, 0) / nums.length
    }

    case 'MIN': {
      const nums: number[] = []
      for (const arg of argNodes) {
        const val = evaluateNode(arg, ctx)
        nums.push(...flattenNumbers(val))
      }
      if (nums.length === 0) throw new FormulaError('#VALOR', 'MIN sem valores')
      return Math.min(...nums)
    }

    case 'MAX': {
      const nums: number[] = []
      for (const arg of argNodes) {
        const val = evaluateNode(arg, ctx)
        nums.push(...flattenNumbers(val))
      }
      if (nums.length === 0) throw new FormulaError('#VALOR', 'MAX sem valores')
      return Math.max(...nums)
    }

    case 'ABS': {
      if (argNodes.length !== 1) throw new FormulaError('#SINTAXE', 'ABS requer 1 argumento')
      return Math.abs(toNumber(evaluateNode(argNodes[0], ctx)))
    }

    case 'ARRED': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'ARRED requer 2 argumentos')
      const val = toNumber(evaluateNode(argNodes[0], ctx))
      const places = toNumber(evaluateNode(argNodes[1], ctx))
      const factor = Math.pow(10, Math.round(places))
      return Math.round(val * factor) / factor
    }

    case 'PORCENTAGEM': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'PORCENTAGEM requer 2 argumentos')
      const parte = toNumber(evaluateNode(argNodes[0], ctx))
      const total = toNumber(evaluateNode(argNodes[1], ctx))
      if (total === 0) throw new FormulaError('#DIV/0', 'Divisão por zero')
      return (parte / total) * 100
    }

    case 'SE': {
      if (argNodes.length < 2 || argNodes.length > 3) {
        throw new FormulaError('#SINTAXE', 'SE requer 2 ou 3 argumentos')
      }
      const condition = toBoolean(evaluateNode(argNodes[0], ctx))
      if (condition) {
        return evaluateNode(argNodes[1], ctx)
      }
      return argNodes.length === 3 ? evaluateNode(argNodes[2], ctx) : ''
    }

    case 'E': {
      if (argNodes.length < 2) throw new FormulaError('#SINTAXE', 'E requer pelo menos 2 argumentos')
      return argNodes.every(arg => toBoolean(evaluateNode(arg, ctx)))
    }

    case 'OU': {
      if (argNodes.length < 2) throw new FormulaError('#SINTAXE', 'OU requer pelo menos 2 argumentos')
      return argNodes.some(arg => toBoolean(evaluateNode(arg, ctx)))
    }

    case 'CLASSIFICAR': {
      if (argNodes.length < 3) throw new FormulaError('#SINTAXE', 'CLASSIFICAR requer pelo menos 3 argumentos')

      const sourceValue = toNumber(evaluateNode(argNodes[0], ctx))
      let i = 1

      while (i < argNodes.length - 1) {
        const thresholdNode = argNodes[i]
        const resultNode = argNodes[i + 1]

        if (thresholdNode.type === 'thresholdPair') {
          const threshold = toNumber(evaluateNode(thresholdNode.value, ctx))
          let matches = false
          switch (thresholdNode.op) {
            case '>=': matches = sourceValue >= threshold; break
            case '<=': matches = sourceValue <= threshold; break
            case '>': matches = sourceValue > threshold; break
            case '<': matches = sourceValue < threshold; break
            case '=': matches = sourceValue === threshold; break
            case '<>': matches = sourceValue !== threshold; break
          }
          if (matches) {
            return evaluateNode(resultNode, ctx)
          }
          i += 2
        } else {
          return evaluateNode(thresholdNode, ctx)
        }
      }

      if (i < argNodes.length) {
        return evaluateNode(argNodes[i], ctx)
      }

      return '-'
    }

    case 'CONT': {
      let count = 0
      for (const arg of argNodes) {
        const val = evaluateNode(arg, ctx)
        if (Array.isArray(val)) {
          count += val.length
        } else if (val !== '' && val !== 0) {
          count++
        }
      }
      return count
    }

    case 'CONT.SE': {
      if (argNodes.length !== 2) throw new FormulaError('#SINTAXE', 'CONT.SE requer 2 argumentos')
      const values = evaluateNode(argNodes[0], ctx)
      const condNode = argNodes[1]

      if (!Array.isArray(values)) throw new FormulaError('#VALOR', 'CONT.SE requer coluna como primeiro argumento')

      if (condNode.type !== 'thresholdPair') {
        throw new FormulaError('#SINTAXE', 'CONT.SE requer condição (ex: >0)')
      }

      const threshold = toNumber(evaluateNode(condNode.value, ctx))
      let count = 0
      for (const val of values) {
        let matches = false
        switch (condNode.op) {
          case '>=': matches = val >= threshold; break
          case '<=': matches = val <= threshold; break
          case '>': matches = val > threshold; break
          case '<': matches = val < threshold; break
          case '=': matches = val === threshold; break
          case '<>': matches = val !== threshold; break
        }
        if (matches) count++
      }
      return count
    }

    case 'CONCAT': {
      return argNodes.map(arg => toString(evaluateNode(arg, ctx))).join('')
    }

    default:
      throw new FormulaError('#SINTAXE', `Função desconhecida: ${name}`)
  }
}

// ========== API Pública ==========

/** Parseia uma fórmula de texto e retorna o AST */
export function parseFormula(input: string): ASTNode {
  const tokens = tokenize(input.trim())
  const parser = new Parser(tokens)
  return parser.parse()
}

/** Formata o resultado da avaliação para string */
function formatResult(result: FormulaValue): string {
  if (typeof result === 'boolean') return result ? 'VERDADEIRO' : 'FALSO'
  if (typeof result === 'number') {
    if (!isFinite(result)) return '#VALOR'
    return Number.isInteger(result) ? String(result) : result.toFixed(2)
  }
  if (Array.isArray(result)) return result.join(', ')
  return String(result)
}

/** Avalia uma fórmula de texto e retorna o resultado formatado */
export function evaluateText(
  formula: string,
  rowId: string,
  data: ScoreTableData,
  depth: number = 0,
): string {
  if (depth >= MAX_DEPTH) return '#CICLO'

  try {
    let body = formula.trim()
    if (body.startsWith('=')) body = body.slice(1).trimStart()

    const ast = parseFormula(body)
    const ctx: FormulaContext = { data, rowId, depth }
    const result = evaluateNode(ast, ctx)
    return formatResult(result)
  } catch (e) {
    if (e instanceof FormulaError) return e.code
    return '#ERRO'
  }
}

/** Avalia uma fórmula e retorna texto + cor de fundo opcional */
export function evaluateTextWithColor(
  formula: string,
  rowId: string,
  data: ScoreTableData,
  depth: number = 0,
): { text: string; bgColor?: string } {
  if (depth >= MAX_DEPTH) return { text: '#CICLO' }

  try {
    let body = formula.trim()
    if (body.startsWith('=')) body = body.slice(1).trimStart()

    const ast = parseFormula(body)
    const ctx: FormulaContext = { data, rowId, depth }
    const result = evaluateNode(ast, ctx)
    const text = formatResult(result)

    // Cor-só: resultado é string hex "#RRGGBB" sem anotação @#
    if (!ctx.resultColor && typeof result === 'string' && /^#[0-9A-Fa-f]{6}$/.test(result)) {
      return { text: '', bgColor: result }
    }

    return { text, bgColor: ctx.resultColor }
  } catch (e) {
    if (e instanceof FormulaError) return { text: e.code }
    return { text: '#ERRO' }
  }
}
