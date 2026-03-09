import type { ChartTemplate } from '@/types'
import { DEFAULT_CHART_TEMPLATES } from '@/lib/default-chart-templates'
import { createTemplateService } from '@/lib/generic-template-service'

const service = createTemplateService<ChartTemplate>(
  DEFAULT_CHART_TEMPLATES,
  'neurohub_chart_templates'
)

export const getChartTemplates = service.getAll
export const getChartTemplate = service.getById
export const saveChartTemplate = service.save
export const deleteChartTemplate = service.remove
export const isDefaultChartTemplate = service.isDefault
export const getChartTemplateCategories = service.getCategories
