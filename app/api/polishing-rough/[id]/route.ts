import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { POLISHING_ROUGH_COLUMNS, POLISHING_ROUGH_EDITABLE_FIELDS } from '@/features/polishing-rough/polishingRoughConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: POLISHING_ROUGH_COLUMNS as readonly SpecColumnLike[],
  editableFields: POLISHING_ROUGH_EDITABLE_FIELDS,
  page: 'polishing-rough',
})

export const PATCH = createPatchRoute({
  table:      'polishing_rough',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[polishing-rough]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'polishing_rough',
  logPrefix: '[polishing-rough]',
})
