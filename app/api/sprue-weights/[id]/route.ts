import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { SPRUE_WEIGHTS_COLUMNS, SPRUE_WEIGHTS_EDITABLE_FIELDS } from '@/features/sprue-weights/sprueWeightsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: SPRUE_WEIGHTS_COLUMNS as readonly SpecColumnLike[],
  editableFields: SPRUE_WEIGHTS_EDITABLE_FIELDS,
  page: 'sprue-weights',
})

export const PATCH = createPatchRoute({
  table:      'sprue_weights',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[sprue-weights]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'sprue_weights',
  logPrefix: '[sprue-weights]',
})
