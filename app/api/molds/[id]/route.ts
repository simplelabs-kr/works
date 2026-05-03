import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { MOLDS_COLUMNS, MOLDS_EDITABLE_FIELDS } from '@/features/molds/moldsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: MOLDS_COLUMNS as readonly SpecColumnLike[],
  editableFields: MOLDS_EDITABLE_FIELDS,
  page: 'molds',
})

export const PATCH = createPatchRoute({
  table:      'molds',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[molds]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'molds',
  logPrefix: '[molds]',
})
