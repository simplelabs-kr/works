import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { ORDERS_COLUMNS, ORDERS_EDITABLE_FIELDS } from '@/features/orders/ordersConfig'

export const maxDuration = 10

// orders 편집 가능 필드 명세는 ordersConfig 의 COLUMNS +
// ORDERS_EDITABLE_FIELDS 로부터 런타임에 파생된다. COLUMNS 에 없는
// orphan 편집 필드가 있으면 overrides 로 명시.
// PATCH 는 flat_orders 가 아닌 orders 원본 테이블을 직접 업데이트한다
// (flat_orders 는 트리거가 동기화).
const FIELD_SPECS = deriveFieldSpecs({
  columns: ORDERS_COLUMNS as readonly SpecColumnLike[],
  editableFields: ORDERS_EDITABLE_FIELDS,
  page: 'orders',
})

export const PATCH = createPatchRoute({
  table:      'orders',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[orders]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'orders',
  logPrefix: '[orders]',
})
