import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { STONES_COLUMNS, STONES_EDITABLE_FIELDS } from '@/features/stones/stonesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: STONES_COLUMNS as readonly SpecColumnLike[],
  editableFields: STONES_EDITABLE_FIELDS,
  page: 'stones',
})

export const PATCH = createPatchRoute({
  table:      'stones',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[stones]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'stones',
  logPrefix: '[stones]',
})
