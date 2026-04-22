import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { PRODUCTS_COLUMNS, PRODUCTS_EDITABLE_FIELDS } from '@/features/products/productsConfig'

export const maxDuration = 10

// FIELD_SPECS 는 productsConfig 의 COLUMNS + EDITABLE_FIELDS 로부터
// 런타임 파생 — 수작업 동기화 불필요. brand_id 는 그리드 컬럼에 없고
// lookup FK 로만 편집되므로 override 로 주입.
const FIELD_SPECS = deriveFieldSpecs({
  columns: PRODUCTS_COLUMNS as readonly SpecColumnLike[],
  editableFields: PRODUCTS_EDITABLE_FIELDS,
  overrides: {
    'brand_id': { type: 'text', maxLength: 64 },
  },
  page: 'products',
})

export const PATCH = createPatchRoute({
  table:      'products',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[products]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'products',
  logPrefix: '[products]',
})
