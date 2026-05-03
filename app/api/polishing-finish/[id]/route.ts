import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { POLISHING_FINISH_COLUMNS, POLISHING_FINISH_EDITABLE_FIELDS } from '@/features/polishing-finish/polishingFinishConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: POLISHING_FINISH_COLUMNS as readonly SpecColumnLike[],
  editableFields: POLISHING_FINISH_EDITABLE_FIELDS,
  page: 'polishing-finish',
})

export const PATCH = createPatchRoute({
  table:      'polishing_finish',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[polishing-finish]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'polishing_finish',
  logPrefix: '[polishing-finish]',
})
