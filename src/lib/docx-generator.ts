import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  ISectionOptions,
  ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import {
  Laudo,
  IdentificationData,
  TextBlockData,
  ScoreTableData,
  InfoBoxData,
  ChartData,
  ReferencesData,
  ClosingPageData,
  SlateContent,
  SlateNode,
  isSlateContent,
} from '@/types'
import { Chart as ChartJS } from 'chart.js'
import '@/lib/chart-setup'
import { getProfessional } from '@/lib/storage'
import { generateSocialIcon, base64ToUint8Array } from '@/lib/social-icons'
import { getImageDimensions } from '@/lib/image-utils'
import { computeCellResult } from '@/lib/formula-engine'

// ========== Color constants ==========
const DARK_BLUE = '1B4F72'
const MEDIUM_BLUE = '2E86C1'
const LIGHT_BLUE = 'D6EAF8'
const WHITE = 'FFFFFF'
const LIGHT_GRAY = 'F2F3F4'
const BORDER_GRAY = 'D5D8DC'

// Page width in twips: A4 = 11906 twips, minus 1.5cm left + 1.5cm right = 11906 - 2*850 = 10206
const PAGE_CONTENT_WIDTH = 10206
const PAGE_MARGIN = 850 // 1.5cm in twips

// ========== Helper: borders ==========
const THIN_BORDER = {
  color: BORDER_GRAY,
  space: 1,
  style: BorderStyle.SINGLE,
  size: 4,
}

const NO_BORDER = {
  color: WHITE,
  space: 0,
  style: BorderStyle.NONE,
  size: 0,
}

// ========== Header / Footer ==========

async function createDocHeader(): Promise<Header> {
  const prof = getProfessional()

  const nameParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 20 },
    children: [
      new TextRun({
        text: prof.name,
        bold: true,
        size: 18,
        font: 'Calibri',
        color: DARK_BLUE,
      }),
    ],
  })

  const specParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 0 },
    children: [
      new TextRun({
        text: `${prof.specialization} — CRP ${prof.crp}`,
        size: 16,
        font: 'Calibri',
        color: MEDIUM_BLUE,
      }),
    ],
  })

  const children: (Paragraph | Table)[] = []

  if (prof.logo) {
    // Decode logo
    const logoParts = prof.logo.split(',')
    if (logoParts.length < 2) return new Header({ children: [nameParagraph, specParagraph] })
    const logoBase64 = logoParts[1]
    const logoBytes = base64ToUint8Array(logoBase64)

    // Get real dimensions and compute proportional size
    const dims = await getImageDimensions(prof.logo).catch(() => null)
    if (!dims) return new Header({ children: [nameParagraph, specParagraph] })
    const maxHeight = 50 // px in header
    const logoHeightPx = Math.min(dims.height, maxHeight)
    const logoWidthPx = Math.round(dims.width * (logoHeightPx / dims.height))

    const logoCellWidth = 1800 // ~1.25 inch for logo column
    const textCellWidth = PAGE_CONTENT_WIDTH - logoCellWidth

    const noBorders = {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
    }

    const headerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: logoCellWidth, type: WidthType.DXA },
              verticalAlign: 'center' as never,
              borders: noBorders,
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: 'png',
                      data: logoBytes,
                      transformation: { width: logoWidthPx, height: logoHeightPx },
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: textCellWidth, type: WidthType.DXA },
              verticalAlign: 'center' as never,
              borders: noBorders,
              children: [nameParagraph, specParagraph],
            }),
          ],
        }),
      ],
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [logoCellWidth, textCellWidth],
      borders: {
        top: NO_BORDER,
        bottom: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
        insideHorizontal: NO_BORDER,
        insideVertical: NO_BORDER,
      },
    })

    children.push(headerTable)
  } else {
    children.push(nameParagraph, specParagraph)
  }

  return new Header({ children })
}

function createDocFooter(): Footer {
  const prof = getProfessional()
  const contactItems = prof.contactItems ?? []

  const children: (Paragraph | Table)[] = []

  // Contact info as a table (if any items exist)
  if (contactItems.length > 0) {
    const noBorders = {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
    }

    const cells: TableCell[] = []

    contactItems.forEach((item, index) => {
      // Icon + text cell
      const iconBytes = generateSocialIcon(item.type)
      cells.push(
        new TableCell({
          borders: noBorders,
          verticalAlign: 'center' as never,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  type: 'png',
                  data: iconBytes,
                  transformation: { width: 10, height: 10 },
                }),
                new TextRun({
                  text: ` ${item.value}`,
                  size: 14,
                  font: 'Calibri',
                  color: '666666',
                }),
              ],
            }),
          ],
        })
      )

      // Separator cell between items
      if (index < contactItems.length - 1) {
        cells.push(
          new TableCell({
            borders: noBorders,
            verticalAlign: 'center' as never,
            width: { size: 300, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '|',
                    size: 14,
                    font: 'Calibri',
                    color: 'BBBBBB',
                  }),
                ],
              }),
            ],
          })
        )
      }
    })

    // Compute column widths: distribute evenly for content cells, fixed for separators
    const separatorCount = contactItems.length - 1
    const separatorWidth = 300
    const contentWidth = PAGE_CONTENT_WIDTH - separatorCount * separatorWidth
    const contentCellWidth = Math.floor(contentWidth / contactItems.length)
    const columnWidths: number[] = []
    contactItems.forEach((_, index) => {
      columnWidths.push(contentCellWidth)
      if (index < contactItems.length - 1) {
        columnWidths.push(separatorWidth)
      }
    })

    const contactTable = new Table({
      rows: [new TableRow({ children: cells })],
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths,
      borders: {
        top: NO_BORDER,
        bottom: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
        insideHorizontal: NO_BORDER,
        insideVertical: NO_BORDER,
      },
    })

    children.push(contactTable)
  }

  // Page number
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20 },
      children: [
        new TextRun({
          text: 'Página ',
          size: 16,
          font: 'Calibri',
          color: '999999',
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          size: 16,
          font: 'Calibri',
          color: '999999',
        }),
        new TextRun({
          text: ' de ',
          size: 16,
          font: 'Calibri',
          color: '999999',
        }),
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
          size: 16,
          font: 'Calibri',
          color: '999999',
        }),
      ],
    })
  )

  return new Footer({ children })
}

// ========== Block renderers ==========

function renderIdentification(data: IdentificationData): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  // Section: Profissional Responsavel
  elements.push(createSectionHeader('PROFISSIONAL RESPONSÁVEL'))

  const profRows = [
    ['Nome', data.professional.name],
    ['CRP', data.professional.crp],
    ['Especialização', data.professional.specialization],
  ]

  elements.push(createKeyValueTable(profRows))

  // Section: Solicitante (if present)
  if (data.solicitor && data.solicitor.name) {
    elements.push(createSectionHeader('SOLICITANTE'))
    const solicitorRows = [
      ['Nome', data.solicitor.name],
      ...(data.solicitor.crm ? [['CRM', data.solicitor.crm]] : []),
      ...(data.solicitor.rqe ? [['RQE', data.solicitor.rqe]] : []),
      ...(data.solicitor.specialty ? [['Especialidade', data.solicitor.specialty]] : []),
    ]
    elements.push(createKeyValueTable(solicitorRows))
  }

  // Section: Dados do Paciente
  elements.push(createSectionHeader('DADOS DO PACIENTE'))
  const guardianLabel = data.patient.guardianRelationship
    ? `Responsável Legal (${data.patient.guardianRelationship})`
    : 'Responsável Legal'

  const patientRows = [
    ['Nome', data.patient.name],
    ['CPF', data.patient.cpf],
    ['Data de Nascimento', formatDateBR(data.patient.birthDate)],
    ['Idade', data.patient.age],
    ['Escolaridade', data.patient.education],
    ['Profissão', data.patient.profession],
    ['Filiação (Mãe)', data.patient.motherName],
    ['Filiação (Pai)', data.patient.fatherName],
    [guardianLabel, data.patient.guardianName ?? ''],
  ].filter(([, val]) => val)

  elements.push(createKeyValueTable(patientRows))

  // Data e local
  elements.push(createSectionHeader('DADOS DO LAUDO'))
  const laudoRows = [
    ['Data', formatDateBR(data.date)],
    ['Local', data.location],
  ].filter(([, val]) => val)
  elements.push(createKeyValueTable(laudoRows))

  // Quebra de página após identificação — página 1 é só apresentação
  elements.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true,
    })
  )

  return elements
}

/**
 * Parse HTML content (from TipTap editor) into docx Paragraphs.
 * Falls back to plain-text splitting for backward compatibility with old laudos.
 */
function parseHtmlToDocxParagraphs(html: string): Paragraph[] {
  // Fallback: if content has no HTML tags, treat as plain text (backward compat)
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const lines = html.split('\n').filter((line) => line.trim() !== '')
    return lines.map(
      (line) =>
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: line, size: 22, font: 'Calibri' })],
        })
    )
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const paragraphs: Paragraph[] = []

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const runs = extractRunsFromNode(el)
      if (runs.length > 0) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED,
            children: runs,
          })
        )
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: node.textContent, size: 22, font: 'Calibri' })],
        })
      )
    }
  }

  return paragraphs
}

/** Recursively extract TextRun objects from an HTML element, preserving bold/italic. */
function extractRunsFromNode(
  node: Node,
  inherited: { bold?: boolean; italics?: boolean } = {}
): TextRun[] {
  const runs: TextRun[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (text) {
        runs.push(
          new TextRun({
            text,
            size: 22,
            font: 'Calibri',
            bold: inherited.bold,
            italics: inherited.italics,
          })
        )
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      const style = {
        bold: inherited.bold || tag === 'strong' || tag === 'b',
        italics: inherited.italics || tag === 'em' || tag === 'i',
      }
      runs.push(...extractRunsFromNode(el, style))
    }
  }

  return runs
}

// ========== Slate JSON → docx ==========

const ALIGNMENT_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
}

function slateLeafToTextRun(
  node: SlateNode,
): TextRun {
  return new TextRun({
    text: node.text ?? '',
    size: 22,
    font: 'Calibri',
    bold: node.bold || undefined,
    italics: node.italic || undefined,
    underline: node.underline ? {} : undefined,
    strike: node.strikethrough || undefined,
  })
}

function parseSlateToDocxParagraphs(content: SlateContent): Paragraph[] {
  const paragraphs: Paragraph[] = []

  for (const node of content) {
    if (node.type === 'p' && Array.isArray(node.children)) {
      const alignment = ALIGNMENT_MAP[node.align as string] ?? AlignmentType.JUSTIFIED
      const runs: TextRun[] = []

      for (const child of node.children) {
        if (typeof child.text === 'string') {
          runs.push(slateLeafToTextRun(child))
        }
      }

      // Lista com indentação
      const indent = typeof node.indent === 'number' ? node.indent : 0
      const listStyleType = node.listStyleType as string | undefined

      if (listStyleType === 'disc') {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            alignment,
            bullet: { level: Math.max(0, indent - 1) },
            children: runs.length > 0 ? runs : [new TextRun({ text: '', size: 22, font: 'Calibri' })],
          })
        )
      } else if (listStyleType === 'decimal') {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            alignment,
            numbering: { reference: 'default-numbering', level: Math.max(0, indent - 1) },
            children: runs.length > 0 ? runs : [new TextRun({ text: '', size: 22, font: 'Calibri' })],
          })
        )
      } else {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 120 },
            alignment,
            indent: indent > 0 ? { left: indent * 720 } : undefined,
            children: runs.length > 0 ? runs : [new TextRun({ text: '', size: 22, font: 'Calibri' })],
          })
        )
      }
    }
  }

  return paragraphs
}

/** Converte conteúdo (HTML legado ou Slate JSON) para docx paragraphs */
function contentToDocxParagraphs(content: string | SlateContent): Paragraph[] {
  if (isSlateContent(content)) return parseSlateToDocxParagraphs(content)
  return parseHtmlToDocxParagraphs(content)
}

function renderText(data: TextBlockData): Paragraph[] {
  const elements: Paragraph[] = []

  if (data.title) {
    elements.push(createSectionHeader(data.title.toUpperCase()))
  }

  if (data.subtitle) {
    elements.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: data.subtitle,
            bold: true,
            italics: true,
            size: 22,
            font: 'Calibri',
            color: MEDIUM_BLUE,
          }),
        ],
      })
    )
  }

  if (data.content && (typeof data.content === 'string' ? data.content.trim() : true)) {
    const contentParagraphs = contentToDocxParagraphs(data.content)
    elements.push(...contentParagraphs)
  }

  if (data.useLabeledItems && data.labeledItems.length > 0) {
    for (const item of data.labeledItems) {
      elements.push(
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: `${item.label}: `,
              bold: true,
              size: 22,
              font: 'Calibri',
              color: '333333',
            }),
            new TextRun({
              text: item.text,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      )
    }
  }

  return elements
}

function renderScoreTable(data: ScoreTableData): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (data.title) {
    elements.push(createSectionHeader(data.title.toUpperCase()))
  }

  if (data.columns.length === 0 || data.rows.length === 0) {
    return elements
  }

  const colCount = data.columns.length
  const colWidth = Math.floor(PAGE_CONTENT_WIDTH / colCount)

  // Header row
  const getDocxAlignment = (col: { alignment?: 'left' | 'center' | 'right' }) => {
    const a = col.alignment ?? 'center'
    return a === 'left' ? AlignmentType.LEFT : a === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER
  }

  const headerCells = data.columns.map(
    (col) =>
      new TableCell({
        width: { size: colWidth, type: WidthType.DXA },
        shading: { fill: DARK_BLUE, type: ShadingType.CLEAR, color: 'auto' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: col.label || 'Sem nome',
                bold: true,
                size: 18,
                font: 'Calibri',
                color: WHITE,
              }),
            ],
          }),
        ],
      })
  )

  const headerRow = new TableRow({ children: headerCells, tableHeader: true })

  // Data rows
  const dataRows = data.rows.map((row, index) => {
    const defaultBgColor = index % 2 === 0 ? WHITE : LIGHT_GRAY
    const cells = data.columns.map((col) => {
      const result = computeCellResult(data, row.id, col.id)
      const cellBgColor = result.bgColor ? result.bgColor.replace('#', '') : defaultBgColor
      const cellTextColor = result.bgColor && result.textColor ? result.textColor.replace('#', '') : undefined
      return new TableCell({
        width: { size: colWidth, type: WidthType.DXA },
        shading: { fill: cellBgColor, type: ShadingType.CLEAR, color: 'auto' },
        children: [
          new Paragraph({
            alignment: getDocxAlignment(col),
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: result.text,
                size: 20,
                font: 'Calibri',
                ...(cellTextColor ? { color: cellTextColor } : {}),
              }),
            ],
          }),
        ],
      })
    })
    return new TableRow({ children: cells })
  })

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    borders: {
      top: THIN_BORDER,
      bottom: THIN_BORDER,
      left: THIN_BORDER,
      right: THIN_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
  })

  elements.push(table)

  if (data.footnote) {
    elements.push(
      new Paragraph({
        spacing: { before: 60, after: 200 },
        children: [
          new TextRun({
            text: data.footnote,
            italics: true,
            size: 18,
            font: 'Calibri',
            color: '666666',
          }),
        ],
      })
    )
  }

  return elements
}

function renderInfoBox(data: InfoBoxData): (Paragraph | Table)[] {
  if (!data.label && !data.content) return []

  const elements: (Paragraph | Table)[] = []

  // Create a table with one cell to simulate the box with left border
  const cellChildren: Paragraph[] = []

  if (data.label) {
    cellChildren.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: data.label,
            bold: true,
            size: 22,
            font: 'Calibri',
            color: DARK_BLUE,
          }),
        ],
      })
    )
  }

  if (data.content) {
    const paragraphs = data.content.split('\n').filter((l) => l.trim())
    for (const para of paragraphs) {
      cellChildren.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: para,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      )
    }
  }

  const table = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR, color: 'auto' },
            borders: {
              top: NO_BORDER,
              bottom: NO_BORDER,
              right: NO_BORDER,
              left: {
                color: MEDIUM_BLUE,
                space: 0,
                style: BorderStyle.SINGLE,
                size: 24,
              },
            },
            children: cellChildren,
            margins: {
              top: convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left: convertInchesToTwip(0.15),
              right: convertInchesToTwip(0.15),
            },
          }),
        ],
      }),
    ],
    width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [PAGE_CONTENT_WIDTH],
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
  })

  elements.push(new Paragraph({ spacing: { before: 200 }, children: [] }))
  elements.push(table)
  elements.push(new Paragraph({ spacing: { after: 200 }, children: [] }))

  return elements
}

async function renderChart(data: ChartData): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = []

  if (data.title) {
    elements.push(createSectionHeader(data.title.toUpperCase()))
  }

  if (data.categories.length === 0 || data.series.length === 0) {
    return elements
  }

  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) return elements

  const displayMode = data.displayMode ?? 'grouped'
  const isSeparated = displayMode === 'separated' && data.chartType !== 'line' && data.series.length > 1

  // ---- Build chart data based on display mode ----
  let chartLabels: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chartDatasets: any[]
  interface GroupBound { seriesIdx: number; start: number; end: number }
  const groupBounds: GroupBound[] = []

  if (isSeparated) {
    const flatLabels: string[] = []
    const flatValues: (number | null)[] = []
    const flatBgColors: string[] = []
    const flatBorderColors: string[] = []

    data.series.forEach((series, sIdx) => {
      const groupStart = flatLabels.length

      data.categories.forEach((cat) => {
        const val = cat.values[series.id] ?? 0
        if (val !== 0) {
          flatLabels.push(cat.label || '')
          flatValues.push(val)
          flatBgColors.push(series.color)
          flatBorderColors.push(series.color)
        }
      })

      const groupEnd = flatLabels.length - 1
      if (groupStart <= groupEnd) {
        groupBounds.push({ seriesIdx: sIdx, start: groupStart, end: groupEnd })
      }

      if (sIdx < data.series.length - 1 && groupStart <= groupEnd) {
        flatLabels.push('')
        flatValues.push(null)
        flatBgColors.push('transparent')
        flatBorderColors.push('transparent')
      }
    })

    chartLabels = flatLabels
    chartDatasets = [{
      data: flatValues,
      backgroundColor: flatBgColors,
      borderColor: flatBorderColors,
      borderWidth: 1,
      borderRadius: 3,
    }]
  } else {
    chartLabels = data.categories.map((c) => c.label || '')
    chartDatasets = data.series.map((series) => {
      const values = data.categories.map((cat) => cat.values[series.id] ?? 0)

      if (data.chartType === 'line') {
        return {
          label: series.label,
          data: values,
          borderColor: series.color,
          backgroundColor: series.color + '33',
          fill: false,
          tension: 0.3,
          pointRadius: 5,
        }
      }

      return {
        label: series.label,
        data: values,
        backgroundColor: series.color,
        borderColor: series.color,
        borderWidth: 1,
        borderRadius: 3,
      }
    })
  }

  // ---- Annotations ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annotations: Record<string, any> = {}

  data.referenceLines.forEach((line) => {
    annotations[line.id] = {
      type: 'line',
      yMin: line.value,
      yMax: line.value,
      borderColor: line.color,
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: line.label,
        position: 'end',
        backgroundColor: line.color,
        color: '#fff',
        font: { size: 12 },
      },
    }
  })

  data.referenceRegions.forEach((region) => {
    annotations[region.id] = {
      type: 'box',
      drawTime: 'beforeDatasetsDraw',
      yMin: region.yMin,
      yMax: region.yMax,
      backgroundColor: region.color,
      borderColor: region.borderColor,
      borderWidth: 1,
    }
  })

  // Separator lines between series groups (separated mode)
  if (isSeparated) {
    groupBounds.forEach((group, i) => {
      if (i < groupBounds.length - 1) {
        const nextGroup = groupBounds[i + 1]
        const separatorX = (group.end + nextGroup.start) / 2
        annotations[`separator-${i}`] = {
          type: 'line',
          xMin: separatorX,
          xMax: separatorX,
          borderColor: '#ccc',
          borderWidth: 1,
          borderDash: [4, 4],
        }
      }
    })
  }

  const chartType = data.chartType === 'line' ? 'line' : 'bar'

  // Compute Y-axis suggestedMax
  const allValues = data.categories.flatMap((cat) =>
    data.series.map((s) => cat.values[s.id] ?? 0)
  )
  const refLineValues = data.referenceLines.map((l) => l.value)
  const refRegionValues = data.referenceRegions.map((r) => r.yMax)
  const maxDataValue = Math.max(0, ...allValues, ...refLineValues, ...refRegionValues)
  const suggestedMax = maxDataValue + 10

  const showRegionLegend = data.showRegionLegend ?? true

  // ---- Inline plugins ----

  const regionLegendPlugin = {
    id: 'regionLegend',
    afterDraw: (chart: ChartJS) => {
      if (!showRegionLegend || data.referenceRegions.length === 0) return

      const c = chart.ctx
      const chartArea = chart.chartArea
      const padding = 10
      const lineHeight = 22
      const boxSize = 14
      const fontSize = 13

      c.save()
      c.font = `${fontSize}px Calibri, sans-serif`

      const entries = data.referenceRegions.map((r) => ({
        text: `${r.label}: ${r.yMin} \u2013 ${r.yMax}`,
        color: r.color,
        borderColor: r.borderColor,
      }))

      const maxTextWidth = Math.max(
        ...entries.map((e) => c.measureText(e.text).width)
      )
      const legendWidth = padding * 2 + boxSize + 8 + maxTextWidth
      const legendHeight = padding * 2 + entries.length * lineHeight - 4

      const x = chartArea.right - legendWidth - 10
      const y = chartArea.top + 10

      c.fillStyle = 'rgba(255, 255, 255, 0.92)'
      c.fillRect(x, y, legendWidth, legendHeight)
      c.strokeStyle = '#ccc'
      c.lineWidth = 1
      c.strokeRect(x, y, legendWidth, legendHeight)

      entries.forEach((entry, i) => {
        const ey = y + padding + i * lineHeight

        c.fillStyle = entry.color
        c.fillRect(x + padding, ey, boxSize, boxSize)
        c.strokeStyle = entry.borderColor
        c.lineWidth = 1
        c.strokeRect(x + padding, ey, boxSize, boxSize)

        c.fillStyle = '#333'
        c.font = `${fontSize}px Calibri, sans-serif`
        c.textBaseline = 'middle'
        c.fillText(entry.text, x + padding + boxSize + 8, ey + boxSize / 2)
      })

      c.restore()
    },
  }

  // Series header labels (separated mode)
  const seriesHeaderPlugin = {
    id: 'seriesHeaders',
    afterDraw: (chart: ChartJS) => {
      if (!isSeparated || groupBounds.length === 0) return

      const c = chart.ctx
      const chartArea = chart.chartArea
      const xScale = chart.scales.x

      c.save()
      groupBounds.forEach((group) => {
        const series = data.series[group.seriesIdx]
        const startX = xScale.getPixelForValue(group.start)
        const endX = xScale.getPixelForValue(group.end)
        const centerX = (startX + endX) / 2

        c.textAlign = 'center'
        c.textBaseline = 'bottom'
        c.font = 'bold 14px Calibri, sans-serif'
        c.fillStyle = series.color
        c.fillText(series.label, centerX, chartArea.top - 6)
      })
      c.restore()
    },
  }

  const chart = new ChartJS(ctx, {
    type: chartType,
    data: { labels: chartLabels, datasets: chartDatasets },
    plugins: [regionLegendPlugin, seriesHeaderPlugin],
    options: {
      responsive: false,
      animation: false,
      layout: {
        padding: {
          top: isSeparated ? 28 : 0,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax,
          title: {
            display: !!data.yAxisLabel,
            text: data.yAxisLabel,
            font: { size: 14 },
          },
          ticks: { font: { size: 12 } },
        },
        x: {
          ticks: { font: { size: 12 } },
        },
      },
      plugins: {
        legend: { display: isSeparated ? false : data.showLegend, labels: { font: { size: 12 } } },
        annotation: { annotations },
        datalabels: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          display: (context: any) =>
            data.showValues && context.dataset.data[context.dataIndex] != null,
          anchor: 'end',
          align: 'top',
          font: { size: 12, weight: 'bold' },
          color: '#333',
        },
      },
    },
  })

  // Wait for render
  chart.update()

  // Export as PNG
  const dataUrl = canvas.toDataURL('image/png')
  const chartParts = dataUrl.split(',')
  if (chartParts.length < 2) {
    chart.destroy()
    return elements
  }
  const base64 = chartParts[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  chart.destroy()

  // ImageRun transformation uses pixels (internally multiplied by 9525 EMU/pixel)
  // Page content width in pixels at 96dpi: 9026 twips / 15 twips_per_pixel ≈ 601px
  // Canvas is 1200x600 (2:1), scale to page width
  const imgWidthPx = Math.round(PAGE_CONTENT_WIDTH / 15)
  const imgHeightPx = Math.round(imgWidthPx / 2) // 2:1 ratio

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new ImageRun({
          type: 'png',
          data: bytes,
          transformation: {
            width: imgWidthPx,
            height: imgHeightPx,
          },
        }),
      ],
    })
  )

  // Description / note below the chart
  const desc = data.description ?? ''
  if (desc.trim()) {
    const paragraphs = desc.split('\n').filter((line) => line.trim() !== '')
    for (const para of paragraphs) {
      elements.push(
        new Paragraph({
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: para,
              italics: true,
              size: 21,
              font: 'Calibri',
              color: '444444',
            }),
          ],
        })
      )
    }
  }

  return elements
}

// ========== References (ABNT) ==========

function renderReferences(data: ReferencesData): Paragraph[] {
  const elements: Paragraph[] = []

  if (data.title) {
    elements.push(createSectionHeader(data.title.toUpperCase()))
  }

  // Each reference with ABNT hanging indent
  for (const ref of data.references) {
    if (!ref.trim()) continue
    elements.push(
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.LEFT,
        indent: {
          left: 720,     // 720 twips = 1.27cm total left margin
          hanging: 720,  // first line goes back to margin = hanging indent
        },
        children: [
          new TextRun({
            text: ref,
            size: 22,
            font: 'Calibri',
          }),
        ],
      })
    )
  }

  return elements
}

// ========== Closing Page ==========

function renderClosingPage(data: ClosingPageData, laudo: Laudo): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  const prof = getProfessional()

  // Find identification block for patient info
  const idBlock = laudo.blocks.find((b) => b.type === 'identification')
  const idData = idBlock?.data as IdentificationData | undefined

  // Backward compatibility: old laudos may have showSignatureLines instead of individual toggles
  const showPatient = data.showPatientSignature ?? data.showSignatureLines ?? true
  const showMother = data.showMotherSignature ?? false
  const showFather = data.showFatherSignature ?? false
  const showGuardian = data.showGuardianSignature ?? false

  // Title with page break before
  if (data.title) {
    elements.push(
      new Paragraph({
        pageBreakBefore: true,
        keepNext: true,
        spacing: { before: 300, after: 150 },
        border: {
          bottom: { color: MEDIUM_BLUE, space: 4, style: BorderStyle.SINGLE, size: 6 },
        },
        children: [
          new TextRun({
            text: data.title.toUpperCase(),
            bold: true,
            size: 24,
            font: 'Calibri',
            color: DARK_BLUE,
          }),
        ],
      })
    )
  }

  // Body text
  if (data.bodyText) {
    const paragraphs = data.bodyText.split('\n').filter((line) => line.trim() !== '')
    for (const para of paragraphs) {
      elements.push(
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: para,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      )
    }
  }

  // ---- City and date line ----
  const location = idData?.location || '____________________'
  elements.push(new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }))
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `${location}, _____ de _______________ de ________`,
          size: 22,
          font: 'Calibri',
        }),
      ],
    })
  )

  // ---- Collect signature entries ----
  type SigEntry = { name: string; subtitle: string; isBold?: boolean; subtitleColor?: string }
  const signatures: SigEntry[] = []

  // Professional (always)
  signatures.push({
    name: prof.name || '____________________',
    subtitle: `CRP ${prof.crp || '__________'}`,
    isBold: true,
    subtitleColor: MEDIUM_BLUE,
  })

  if (showPatient) {
    signatures.push({
      name: idData?.patient?.name || 'Paciente',
      subtitle: 'Paciente',
    })
  }
  if (showMother) {
    signatures.push({
      name: idData?.patient?.motherName || 'Mãe',
      subtitle: 'Mãe',
    })
  }
  if (showFather) {
    signatures.push({
      name: idData?.patient?.fatherName || 'Pai',
      subtitle: 'Pai',
    })
  }
  if (showGuardian) {
    const guardianRel = idData?.patient?.guardianRelationship
    signatures.push({
      name: idData?.patient?.guardianName || 'Responsável Legal',
      subtitle: guardianRel ? `Responsável Legal (${guardianRel})` : 'Responsável Legal',
    })
  }

  // ---- Render signatures in 2-column table ----
  const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
  const colWidth = Math.floor(PAGE_CONTENT_WIDTH / 2)

  function makeSignatureCell(sig?: SigEntry): TableCell {
    if (!sig) {
      return new TableCell({
        borders: noBorders,
        children: [new Paragraph({ children: [] })],
      })
    }
    return new TableCell({
      borders: noBorders,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: '________________________________',
              size: 22,
              font: 'Calibri',
              color: '999999',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: sig.name,
              bold: sig.isBold ?? false,
              size: 22,
              font: 'Calibri',
              color: sig.isBold ? DARK_BLUE : '333333',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: sig.subtitle,
              size: 18,
              font: 'Calibri',
              color: sig.subtitleColor ?? '999999',
            }),
          ],
        }),
      ],
    })
  }

  // Build rows, 2 signatures per row
  const sigRows: TableRow[] = []
  for (let i = 0; i < signatures.length; i += 2) {
    sigRows.push(
      new TableRow({
        children: [
          makeSignatureCell(signatures[i]),
          makeSignatureCell(signatures[i + 1]),
        ],
      })
    )
  }

  elements.push(
    new Table({
      rows: sigRows,
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [colWidth, colWidth],
      borders: {
        top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
        insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
      },
    })
  )

  // ---- Footer note ----
  const footerNote = data.footerNote ?? ''
  if (footerNote.trim()) {
    elements.push(new Paragraph({ spacing: { before: 200 }, children: [] }))
    const noteParagraphs = footerNote.split('\n').filter((l) => l.trim() !== '')
    for (const para of noteParagraphs) {
      elements.push(
        new Paragraph({
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: para,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      )
    }
  }

  return elements
}

// ========== Helpers ==========

function createSectionHeader(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 300, after: 150 },
    border: {
      bottom: { color: MEDIUM_BLUE, space: 4, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: 'Calibri',
        color: DARK_BLUE,
      }),
    ],
  })
}

function createKeyValueTable(rows: string[][]): Table {
  const labelWidth = Math.floor(PAGE_CONTENT_WIDTH * 0.3)
  const valueWidth = PAGE_CONTENT_WIDTH - labelWidth

  const tableRows = rows.map(
    ([key, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelWidth, type: WidthType.DXA },
            borders: {
              top: NO_BORDER,
              bottom: { color: LIGHT_GRAY, space: 0, style: BorderStyle.SINGLE, size: 2 },
              left: NO_BORDER,
              right: NO_BORDER,
            },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: key,
                    bold: true,
                    size: 20,
                    font: 'Calibri',
                    color: DARK_BLUE,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: valueWidth, type: WidthType.DXA },
            borders: {
              top: NO_BORDER,
              bottom: { color: LIGHT_GRAY, space: 0, style: BorderStyle.SINGLE, size: 2 },
              left: NO_BORDER,
              right: NO_BORDER,
            },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: value || '',
                    size: 20,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  )

  return new Table({
    rows: tableRows,
    width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
  })
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ========== Main generator ==========

export async function generateDocx(laudo: Laudo): Promise<void> {
  const sortedBlocks = [...laudo.blocks].sort((a, b) => a.order - b.order)

  const sectionChildren: (Paragraph | Table)[] = []

  // Render each block
  for (const block of sortedBlocks) {
    switch (block.type) {
      case 'identification':
        sectionChildren.push(...renderIdentification(block.data as IdentificationData))
        break
      case 'text':
        sectionChildren.push(...renderText(block.data as TextBlockData))
        break
      case 'score-table':
        sectionChildren.push(...renderScoreTable(block.data as ScoreTableData))
        break
      case 'info-box':
        sectionChildren.push(...renderInfoBox(block.data as InfoBoxData))
        break
      case 'chart':
        sectionChildren.push(...(await renderChart(block.data as ChartData)))
        break
      case 'references':
        sectionChildren.push(...renderReferences(block.data as ReferencesData))
        break
      case 'closing-page':
        sectionChildren.push(...renderClosingPage(block.data as ClosingPageData, laudo))
        break
    }

    // Spacing between blocks
    sectionChildren.push(new Paragraph({ spacing: { after: 100 }, children: [] }))
  }

  const sectionProperties: ISectionOptions = {
    properties: {
      page: {
        margin: {
          top: PAGE_MARGIN,
          bottom: PAGE_MARGIN,
          left: PAGE_MARGIN,
          right: PAGE_MARGIN,
          header: 280, // ~0.5cm from top edge
          footer: 280, // ~0.5cm from bottom edge
        },
        pageNumbers: {
          start: 1,
          formatType: NumberFormat.DECIMAL,
        },
      },
    },
    headers: {
      default: await createDocHeader(),
    },
    footers: {
      default: createDocFooter(),
    },
    children: sectionChildren,
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            { level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
            { level: 1, format: NumberFormat.LOWER_LETTER, text: '%2)', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
            { level: 2, format: NumberFormat.LOWER_ROMAN, text: '%3.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
          },
        },
      },
    },
    sections: [sectionProperties],
  })

  const blob = await Packer.toBlob(doc)

  const fileName = laudo.patientName
    ? `Laudo - ${laudo.patientName}.docx`
    : `Laudo - ${new Date().toISOString().split('T')[0]}.docx`

  saveAs(blob, fileName)
}
