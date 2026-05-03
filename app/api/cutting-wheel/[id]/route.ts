import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { CUTTING_WHEEL_COLUMNS, CUTTING_WHEEL_EDITABLE_FIELDS } from '@/features/cutting-wheel/cuttingWheelConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: CUTTING_WHEEL_COLUMNS as readonly SpecColumnLike[],
  editableFields: CUTTING_WHEEL_EDITABLE_FIELDS,
  page: 'cutting-wheel',
})

export const PATCH = createPatchRoute({
  table:      'cutting_wheel',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[cutting-wheel]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'cutting_wheel',
  logPrefix: '[cutting-wheel]',
})
