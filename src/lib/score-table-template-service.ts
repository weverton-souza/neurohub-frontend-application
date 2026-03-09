import type { ScoreTableTemplate } from '@/types'
import { DEFAULT_SCORE_TABLE_TEMPLATES } from '@/lib/default-score-templates'
import { createTemplateService } from '@/lib/generic-template-service'

const service = createTemplateService<ScoreTableTemplate>(
  DEFAULT_SCORE_TABLE_TEMPLATES,
  'neurohub_score_table_templates'
)

export const getScoreTableTemplates = service.getAll
export const getScoreTableTemplate = service.getById
export const saveScoreTableTemplate = service.save
export const deleteScoreTableTemplate = service.remove
export const isDefaultScoreTableTemplate = service.isDefault
export const getTemplateCategories = service.getCategories
