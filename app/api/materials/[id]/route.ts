import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { MATERIALS_COLUMNS, MATERIALS_EDITABLE_FIELDS } from '@/features/materials/materialsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: MATERIALS_COLUMNS as readonly SpecColumnLike[],
  editableFields: MATERIALS_EDITABLE_FIELDS,
  page: 'materials',
})

export const PATCH = createPatchRoute({
  table:      'materials',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[materials]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'materials',
  logPrefix: '[materials]',
})
