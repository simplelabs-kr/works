import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { STONE_CUTS_COLUMNS, STONE_CUTS_EDITABLE_FIELDS } from '@/features/stone-cuts/stoneCutsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: STONE_CUTS_COLUMNS as readonly SpecColumnLike[],
  editableFields: STONE_CUTS_EDITABLE_FIELDS,
  page: 'stone-cuts',
})

export const PATCH = createPatchRoute({
  table:      'stone_cuts',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[stone-cuts]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'stone_cuts',
  logPrefix: '[stone-cuts]',
})
