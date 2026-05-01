import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { METAL_PRICES_COLUMNS, METAL_PRICES_EDITABLE_FIELDS } from '@/features/metal-prices/metalPricesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: METAL_PRICES_COLUMNS as readonly SpecColumnLike[],
  editableFields: METAL_PRICES_EDITABLE_FIELDS,
  page: 'metal-prices',
})

export const PATCH = createPatchRoute({
  table:      'metal_prices',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[metal-prices]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'metal_prices',
  logPrefix: '[metal-prices]',
})
