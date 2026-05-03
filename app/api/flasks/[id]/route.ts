import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { FLASKS_COLUMNS, FLASKS_EDITABLE_FIELDS } from '@/features/flasks/flasksConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: FLASKS_COLUMNS as readonly SpecColumnLike[],
  editableFields: FLASKS_EDITABLE_FIELDS,
  page: 'flasks',
})

export const PATCH = createPatchRoute({
  table:      'flasks',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[flasks]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'flasks',
  logPrefix: '[flasks]',
})
