import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { PURCHASES_COLUMNS, PURCHASES_EDITABLE_FIELDS } from '@/features/purchases/purchasesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: PURCHASES_COLUMNS as readonly SpecColumnLike[],
  editableFields: PURCHASES_EDITABLE_FIELDS,
  // Link 컬럼 FK orphan 편집 키.
  overrides: {
    order_item_id: { type: 'text', maxLength: 64 },
  },
  page: 'purchases',
})

export const PATCH = createPatchRoute({
  table:      'purchases',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[purchases]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'purchases',
  logPrefix: '[purchases]',
})
