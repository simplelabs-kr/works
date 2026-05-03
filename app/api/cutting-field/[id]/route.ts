import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { CUTTING_FIELD_COLUMNS, CUTTING_FIELD_EDITABLE_FIELDS } from '@/features/cutting-field/cuttingFieldConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: CUTTING_FIELD_COLUMNS as readonly SpecColumnLike[],
  editableFields: CUTTING_FIELD_EDITABLE_FIELDS,
  page: 'cutting-field',
})

export const PATCH = createPatchRoute({
  table:      'cutting_field',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[cutting-field]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'cutting_field',
  logPrefix: '[cutting-field]',
})
