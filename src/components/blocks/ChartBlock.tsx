import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  ChartData,
  ChartSeries,
  ChartCategory,
  ChartReferenceLine,
  ChartReferenceRegion,
  ChartType,
  ChartDisplayMode,
} from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { CloseIcon } from '@/components/icons'
import ColorPicker from '@/components/ui/ColorPicker'
import { Chart as ChartJS } from 'chart.js'
import { createChartTemplate, getChartTemplates } from '@/lib/api/template-api'
import '@/lib/docx-engine/chart/setup'

interface ChartBlockProps {
  data: ChartData
  onChange: (data: ChartData) => void
}

const CHART_TYPE_OPTIONS = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linha' },
]

const DISPLAY_MODE_OPTIONS = [
  { value: 'grouped', label: 'Agrupado' },
  { value: 'separated', label: 'Separado' },
]

const DEFAULT_COLORS = [
  '#007AFF', '#0055B3', '#27AE60', '#E74C3C', '#F39C12',
  '#8E44AD', '#16A085', '#D35400', '#2C3E50', '#C0392B',
]

interface GroupBound {
  seriesIdx: number
  start: number
  end: number
}

export default function ChartBlock({ data, onChange }: ChartBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)

  // Save as template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateInstrument, setTemplateInstrument] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)

  const openSaveTemplateModal = () => {
    setTemplateName(data.title || '')
    setTemplateDescription('')
    setTemplateInstrument('')
    setTemplateCategory('')
    setShowSaveTemplate(true)
  }

  const handleSaveTemplate = async () => {
    try {
      await createChartTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        instrumentName: templateInstrument.trim(),
        category: templateCategory.trim(),
        chartType: data.chartType,
        displayMode: data.displayMode,
        series: data.series.map(s => ({ ...s })),
        categories: data.categories.map(c => ({
          ...c,
          values: { ...c.values },
        })),
        referenceLines: data.referenceLines.map(r => ({ ...r })),
        referenceRegions: data.referenceRegions.map(r => ({ ...r })),
        yAxisLabel: data.yAxisLabel,
        showValues: data.showValues,
        showLegend: data.showLegend,
        showRegionLegend: data.showRegionLegend ?? true,
        isDefault: false,
      })
      setShowSaveTemplate(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
    } catch {
      // error saving template
    }
  }

  const canSaveTemplate = templateName.trim() && templateInstrument.trim() && templateCategory.trim()

  const [existingCategories, setExistingCategories] = useState<string[]>([])
  useEffect(() => {
    if (!showSaveTemplate) return
    getChartTemplates()
      .then(tpls => {
        const cats = [...new Set(tpls.map(t => t.category))]
        setExistingCategories(cats.sort())
      })
      .catch(() => {})
  }, [showSaveTemplate])

  // Backwards-compatible defaults for new fields
  const showRegionLegend = data.showRegionLegend ?? true
  const description = data.description ?? ''
  const displayMode = data.displayMode ?? 'grouped'
  const isSeparated = displayMode === 'separated' && data.chartType !== 'line' && data.series.length > 1

  // Render chart
  useEffect(() => {
    if (!canvasRef.current) return
    if (data.categories.length === 0 || data.series.length === 0) {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
      return
    }

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // ---- Build chart data based on display mode ----
    let chartLabels: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chartDatasets: any[]
    const groupBounds: GroupBound[] = []

    if (isSeparated) {
      // SEPARATED: flatten all series into one dataset, each bar colored by its series
      const flatLabels: string[] = []
      const flatValues: (number | null)[] = []
      const flatBgColors: string[] = []
      const flatBorderColors: string[] = []

      data.series.forEach((series, sIdx) => {
        const groupStart = flatLabels.length

        data.categories.forEach((cat) => {
          const val = cat.values[series.id] ?? 0
          if (val !== 0) {
            flatLabels.push(cat.label || 'Sem nome')
            flatValues.push(val)
            flatBgColors.push(series.color)
            flatBorderColors.push(series.color)
          }
        })

        const groupEnd = flatLabels.length - 1
        if (groupStart <= groupEnd) {
          groupBounds.push({ seriesIdx: sIdx, start: groupStart, end: groupEnd })
        }

        // Add gap between series (except last)
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
      // GROUPED (default): standard Chart.js grouped bars / line
      chartLabels = data.categories.map((c) => c.label || 'Sem nome')
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
            pointHoverRadius: 7,
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

    // Reference lines
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
          font: { size: 10 },
        },
      }
    })

    // Reference regions — drawn BEHIND bars
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

    // Separator lines between series groups (separated mode only)
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

    // ---- Compute Y-axis suggestedMax ----
    const allValues = data.categories.flatMap((cat) =>
      data.series.map((s) => cat.values[s.id] ?? 0)
    )
    const refLineValues = data.referenceLines.map((l) => l.value)
    const refRegionValues = data.referenceRegions.map((r) => r.yMax)
    const maxDataValue = Math.max(0, ...allValues, ...refLineValues, ...refRegionValues)
    const suggestedMax = maxDataValue + 10

    // ---- Inline plugins ----

    // Region legend box
    const regionLegendPlugin = {
      id: 'regionLegend',
      afterDraw: (chart: ChartJS) => {
        if (!showRegionLegend || data.referenceRegions.length === 0) return

        const c = chart.ctx
        const chartArea = chart.chartArea
        const padding = 8
        const lineHeight = 18
        const boxSize = 12
        const fontSize = 11

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

        const x = chartArea.right - legendWidth - 8
        const y = chartArea.top + 8

        c.shadowColor = 'rgba(0,0,0,0.08)'
        c.shadowBlur = 4
        c.shadowOffsetY = 1
        c.fillStyle = 'rgba(255, 255, 255, 0.92)'
        c.fillRect(x, y, legendWidth, legendHeight)

        c.shadowColor = 'transparent'
        c.strokeStyle = '#ddd'
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

    // Series header labels (separated mode only)
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
          c.font = 'bold 12px Calibri, sans-serif'
          c.fillStyle = series.color
          c.fillText(series.label, centerX, chartArea.top - 5)
        })
        c.restore()
      },
    }

    // ---- Create chart ----
    chartRef.current = new ChartJS(ctx, {
      type: chartType,
      data: { labels: chartLabels, datasets: chartDatasets },
      plugins: [regionLegendPlugin, seriesHeaderPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 300 },
        layout: {
          padding: {
            top: isSeparated ? 24 : 0,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax,
            title: {
              display: !!data.yAxisLabel,
              text: data.yAxisLabel,
              font: { size: 12 },
            },
          },
          x: {
            ticks: { font: { size: 11 } },
          },
        },
        plugins: {
          legend: { display: isSeparated ? false : data.showLegend },
          tooltip: { enabled: true },
          annotation: { annotations },
          datalabels: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            display: (context: any) =>
              data.showValues && context.dataset.data[context.dataIndex] != null,
            anchor: 'end',
            align: 'top',
            font: { size: 11, weight: 'bold' },
            color: '#333',
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, showRegionLegend, isSeparated])

  // --- Series management ---
  const addSeries = useCallback(() => {
    const idx = data.series.length
    const newSeries: ChartSeries = {
      id: crypto.randomUUID(),
      label: `Série ${idx + 1}`,
      color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    }
    onChange({ ...data, series: [...data.series, newSeries] })
  }, [data, onChange])

  const removeSeries = useCallback(
    (seriesId: string) => {
      const series = data.series.filter((s) => s.id !== seriesId)
      const categories = data.categories.map((cat) => {
        const values = { ...cat.values }
        delete values[seriesId]
        return { ...cat, values }
      })
      onChange({ ...data, series, categories })
    },
    [data, onChange]
  )

  const updateSeries = useCallback(
    (seriesId: string, updates: Partial<ChartSeries>) => {
      const series = data.series.map((s) =>
        s.id === seriesId ? { ...s, ...updates } : s
      )
      onChange({ ...data, series })
    },
    [data, onChange]
  )

  // --- Category management ---
  const addCategory = useCallback(() => {
    const values: Record<string, number> = {}
    data.series.forEach((s) => (values[s.id] = 0))
    const newCat: ChartCategory = {
      id: crypto.randomUUID(),
      label: '',
      values,
    }
    onChange({ ...data, categories: [...data.categories, newCat] })
  }, [data, onChange])

  const removeCategory = useCallback(
    (catId: string) => {
      onChange({
        ...data,
        categories: data.categories.filter((c) => c.id !== catId),
      })
    },
    [data, onChange]
  )

  const updateCategoryLabel = useCallback(
    (catId: string, label: string) => {
      const categories = data.categories.map((c) =>
        c.id === catId ? { ...c, label } : c
      )
      onChange({ ...data, categories })
    },
    [data, onChange]
  )

  const updateCategoryValue = useCallback(
    (catId: string, seriesId: string, value: string) => {
      const numValue = value === '' ? 0 : parseFloat(value) || 0
      const categories = data.categories.map((c) =>
        c.id === catId
          ? { ...c, values: { ...c.values, [seriesId]: numValue } }
          : c
      )
      onChange({ ...data, categories })
    },
    [data, onChange]
  )

  // --- Reference lines ---
  const addReferenceLine = useCallback(() => {
    const newLine: ChartReferenceLine = {
      id: crypto.randomUUID(),
      label: 'Média',
      value: 10,
      color: '#E74C3C',
    }
    onChange({
      ...data,
      referenceLines: [...data.referenceLines, newLine],
    })
  }, [data, onChange])

  const removeReferenceLine = useCallback(
    (lineId: string) => {
      onChange({
        ...data,
        referenceLines: data.referenceLines.filter((l) => l.id !== lineId),
      })
    },
    [data, onChange]
  )

  const updateReferenceLine = useCallback(
    (lineId: string, updates: Partial<ChartReferenceLine>) => {
      const referenceLines = data.referenceLines.map((l) =>
        l.id === lineId ? { ...l, ...updates } : l
      )
      onChange({ ...data, referenceLines })
    },
    [data, onChange]
  )

  // --- Reference regions ---
  const addReferenceRegion = useCallback(() => {
    const newRegion: ChartReferenceRegion = {
      id: crypto.randomUUID(),
      label: 'Média',
      yMin: 8,
      yMax: 12,
      color: '#27AE6033',
      borderColor: '#27AE60',
    }
    onChange({
      ...data,
      referenceRegions: [...data.referenceRegions, newRegion],
    })
  }, [data, onChange])

  const removeReferenceRegion = useCallback(
    (regionId: string) => {
      onChange({
        ...data,
        referenceRegions: data.referenceRegions.filter((r) => r.id !== regionId),
      })
    },
    [data, onChange]
  )

  const updateReferenceRegion = useCallback(
    (regionId: string, updates: Partial<ChartReferenceRegion>) => {
      const referenceRegions = data.referenceRegions.map((r) =>
        r.id === regionId ? { ...r, ...updates } : r
      )
      onChange({ ...data, referenceRegions })
    },
    [data, onChange]
  )

  return (
    <div className="space-y-4">
      {/* Title + type + display mode */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <Input
            label="Título do gráfico"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Ex: Escores WAIS-IV"
          />
        </div>
        <Select
          label="Tipo"
          value={data.chartType}
          onChange={(value) =>
            onChange({ ...data, chartType: value as ChartType })
          }
          options={CHART_TYPE_OPTIONS}
        />
        {data.chartType === 'bar' && data.series.length > 1 && (
          <Select
            label="Exibição"
            value={displayMode}
            onChange={(value) =>
              onChange({ ...data, displayMode: value as ChartDisplayMode })
            }
            options={DISPLAY_MODE_OPTIONS}
          />
        )}
      </div>

      <Input
        label="Eixo Y (label)"
        value={data.yAxisLabel}
        onChange={(e) => onChange({ ...data, yAxisLabel: e.target.value })}
        placeholder="Ex: Pontuação Ponderada"
      />

      {/* Series */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Séries</span>
          <Button variant="ghost" size="sm" onClick={addSeries}>
            + Série
          </Button>
        </div>
        {data.series.map((series) => (
          <div key={series.id} className="flex items-center gap-2">
            <ColorPicker
              value={series.color}
              onChange={(color) => updateSeries(series.id, { color })}
            />
            <input
              type="text"
              value={series.label}
              onChange={(e) =>
                updateSeries(series.id, { label: e.target.value })
              }
              className="flex-1 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Nome da série"
            />
            {data.series.length > 1 && (
              <button
                type="button"
                onClick={() => removeSeries(series.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                title="Remover série"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Separated mode hint */}
      {isSeparated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-700">
            <strong>Modo separado:</strong> Cada série é exibida em sua própria seção.
            Categorias com valor 0 em uma série são omitidas dessa seção.
          </p>
        </div>
      )}

      {/* Data table (categories x series) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Dados</span>
          <Button variant="ghost" size="sm" onClick={addCategory}>
            + Categoria
          </Button>
        </div>

        {data.categories.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[140px]">
                    Categoria
                  </th>
                  {data.series.map((s) => (
                    <th
                      key={s.id}
                      className="px-3 py-2 text-center text-xs font-medium min-w-[100px]"
                      style={{ color: s.color }}
                    >
                      {s.label}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat, idx) => (
                  <tr
                    key={cat.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) =>
                          updateCategoryLabel(cat.id, e.target.value)
                        }
                        className="w-full bg-transparent border-0 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded"
                        placeholder="Ex: Vocabulário"
                      />
                    </td>
                    {data.series.map((s) => (
                      <td key={s.id} className="px-1 py-1">
                        <input
                          type="number"
                          value={cat.values[s.id] ?? 0}
                          onChange={(e) =>
                            updateCategoryValue(cat.id, s.id, e.target.value)
                          }
                          className="w-full bg-transparent border-0 px-2 py-1.5 text-sm text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-brand-500 rounded"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() => removeCategory(cat.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remover categoria"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            Adicione categorias para criar o gráfico.
          </p>
        )}
      </div>

      {/* Reference lines */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Linhas de Referência
          </span>
          <Button variant="ghost" size="sm" onClick={addReferenceLine}>
            + Linha
          </Button>
        </div>
        {data.referenceLines.map((line) => (
          <div key={line.id} className="flex items-center gap-2">
            <ColorPicker
              value={line.color}
              onChange={(color) => updateReferenceLine(line.id, { color })}
            />
            <input
              type="text"
              value={line.label}
              onChange={(e) =>
                updateReferenceLine(line.id, { label: e.target.value })
              }
              className="flex-1 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Label"
            />
            <input
              type="number"
              value={line.value}
              onChange={(e) =>
                updateReferenceLine(line.id, {
                  value: parseFloat(e.target.value) || 0,
                })
              }
              className="w-20 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Valor"
            />
            <button
              type="button"
              onClick={() => removeReferenceLine(line.id)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Reference regions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Regiões de Referência
          </span>
          <Button variant="ghost" size="sm" onClick={addReferenceRegion}>
            + Região
          </Button>
        </div>
        {data.referenceRegions.map((region) => (
          <div key={region.id} className="flex items-center gap-2">
            <ColorPicker
              value={region.borderColor}
              onChange={(borderColor) => {
                const color = borderColor + '33' // 20% opacity
                updateReferenceRegion(region.id, { borderColor, color })
              }}
            />
            <input
              type="text"
              value={region.label}
              onChange={(e) =>
                updateReferenceRegion(region.id, { label: e.target.value })
              }
              className="flex-1 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Label"
            />
            <input
              type="number"
              value={region.yMin}
              onChange={(e) =>
                updateReferenceRegion(region.id, {
                  yMin: parseFloat(e.target.value) || 0,
                })
              }
              className="w-16 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Min"
              title="Valor mínimo"
            />
            <span className="text-gray-400 text-xs">a</span>
            <input
              type="number"
              value={region.yMax}
              onChange={(e) =>
                updateReferenceRegion(region.id, {
                  yMax: parseFloat(e.target.value) || 0,
                })
              }
              className="w-16 bg-transparent border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Max"
              title="Valor máximo"
            />
            <button
              type="button"
              onClick={() => removeReferenceRegion(region.id)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.showValues}
            onChange={(e) =>
              onChange({ ...data, showValues: e.target.checked })
            }
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Mostrar valores
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.showLegend}
            onChange={(e) =>
              onChange({ ...data, showLegend: e.target.checked })
            }
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Mostrar legenda
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRegionLegend}
            onChange={(e) =>
              onChange({ ...data, showRegionLegend: e.target.checked })
            }
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Legenda de regiões
        </label>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <p className="text-xs text-gray-400 mb-2">Preview</p>
        {data.categories.length === 0 || data.series.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Adicione séries e categorias para ver o preview.
          </p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição / Nota
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-y min-h-[80px]"
          placeholder="Texto descritivo ou interpretativo que aparecerá abaixo do gráfico no laudo"
          rows={3}
        />
      </div>

      {/* Save as template */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={openSaveTemplateModal}
          disabled={data.series.length === 0}
          className="whitespace-nowrap"
        >
          {savedFeedback ? 'Template salvo!' : 'Salvar como Template'}
        </Button>
      </div>

      {/* Modal salvar como template */}
      <Modal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        title="Salvar como Template"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex: WAIS-III — Perfil de Subtestes"
          />
          <Input
            label="Instrumento *"
            value={templateInstrument}
            onChange={(e) => setTemplateInstrument(e.target.value)}
            placeholder="Ex: WAIS-III, RAVLT"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria *
            </label>
            <input
              type="text"
              list="chart-template-categories"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              placeholder="Ex: Inteligência, Memória, Atenção"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <datalist id="chart-template-categories">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <Input
            label="Descrição"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Breve descrição do template (opcional)"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveTemplate(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!canSaveTemplate}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
