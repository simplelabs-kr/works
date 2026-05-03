import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { STONE_TYPES_COLUMNS, STONE_TYPES_EDITABLE_FIELDS } from '@/features/stone-types/stoneTypesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: STONE_TYPES_COLUMNS as readonly SpecColumnLike[],
  editableFields: STONE_TYPES_EDITABLE_FIELDS,
  page: 'stone-types',
})

export const PATCH = createPatchRoute({
  table:      'stone_types',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[stone-types]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'stone_types',
  logPrefix: '[stone-types]',
})
