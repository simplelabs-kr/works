import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { CASTING_INPUTS_COLUMNS, CASTING_INPUTS_EDITABLE_FIELDS } from '@/features/casting-inputs/castingInputsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: CASTING_INPUTS_COLUMNS as readonly SpecColumnLike[],
  editableFields: CASTING_INPUTS_EDITABLE_FIELDS,
  page: 'casting-inputs',
})

export const PATCH = createPatchRoute({
  table:      'casting_inputs',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[casting-inputs]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'casting_inputs',
  logPrefix: '[casting-inputs]',
})
