import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { PRICE_CHANGES_COLUMNS, PRICE_CHANGES_EDITABLE_FIELDS } from '@/features/price-changes/priceChangesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: PRICE_CHANGES_COLUMNS as readonly SpecColumnLike[],
  editableFields: PRICE_CHANGES_EDITABLE_FIELDS,
  page: 'price-changes',
})

export const PATCH = createPatchRoute({
  table:      'price_changes',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[price-changes]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'price_changes',
  logPrefix: '[price-changes]',
})
