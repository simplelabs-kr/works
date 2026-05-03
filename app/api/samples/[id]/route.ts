import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { SAMPLES_COLUMNS, SAMPLES_EDITABLE_FIELDS } from '@/features/samples/samplesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: SAMPLES_COLUMNS as readonly SpecColumnLike[],
  editableFields: SAMPLES_EDITABLE_FIELDS,
  page: 'samples',
})

export const PATCH = createPatchRoute({
  table:      'samples',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[samples]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'samples',
  logPrefix: '[samples]',
})
