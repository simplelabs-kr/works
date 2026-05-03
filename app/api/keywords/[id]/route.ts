import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { KEYWORDS_COLUMNS, KEYWORDS_EDITABLE_FIELDS } from '@/features/keywords/keywordsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: KEYWORDS_COLUMNS as readonly SpecColumnLike[],
  editableFields: KEYWORDS_EDITABLE_FIELDS,
  page: 'keywords',
})

export const PATCH = createPatchRoute({
  table:      'keywords',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[keywords]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'keywords',
  logPrefix: '[keywords]',
})
