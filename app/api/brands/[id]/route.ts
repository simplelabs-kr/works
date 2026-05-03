import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { BRANDS_COLUMNS, BRANDS_EDITABLE_FIELDS } from '@/features/brands/brandsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: BRANDS_COLUMNS as readonly SpecColumnLike[],
  editableFields: BRANDS_EDITABLE_FIELDS,
  page: 'brands',
})

export const PATCH = createPatchRoute({
  table:      'brands',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[brands]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'brands',
  logPrefix: '[brands]',
})
