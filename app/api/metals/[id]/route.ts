import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { METALS_COLUMNS, METALS_EDITABLE_FIELDS } from '@/features/metals/metalsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: METALS_COLUMNS as readonly SpecColumnLike[],
  editableFields: METALS_EDITABLE_FIELDS,
  page: 'metals',
})

export const PATCH = createPatchRoute({
  table:      'metals',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[metals]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'metals',
  logPrefix: '[metals]',
})
