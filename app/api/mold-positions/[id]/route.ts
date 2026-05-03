import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { MOLD_POSITIONS_COLUMNS, MOLD_POSITIONS_EDITABLE_FIELDS } from '@/features/mold-positions/moldPositionsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: MOLD_POSITIONS_COLUMNS as readonly SpecColumnLike[],
  editableFields: MOLD_POSITIONS_EDITABLE_FIELDS,
  page: 'mold-positions',
})

export const PATCH = createPatchRoute({
  table:      'mold_positions',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[mold-positions]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'mold_positions',
  logPrefix: '[mold-positions]',
})
