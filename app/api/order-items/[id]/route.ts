import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { COLUMNS, EDITABLE_FIELD_MAP } from '@/features/works/worksConfig'

export const maxDuration = 10

// FIELD_SPECS 는 worksConfig 의 COLUMNS + EDITABLE_FIELD_MAP 로부터
// 런타임 파생. `출고` 는 행 액션 전용(그리드 컬럼 없음)이라 override 로 추가.
// 사출_방식 / 작업_위치 는 이전에 enum 검증이었으나 field_options 카탈로그
// (runtime 동적 값) 와 드리프트 가능성이 있어 select → text(50) 로 완화
// — repairs 가 동일 필드에서 이미 사용하는 패턴과 맞춘 것.
const FIELD_SPECS = deriveFieldSpecs({
  columns: COLUMNS as readonly SpecColumnLike[],
  editableFields: EDITABLE_FIELD_MAP,
  overrides: {
    '출고': { type: 'boolean' },
    // linklist FK orphan — 카탈로그 컬럼은 denormalized 표시 컬럼을 가리키고
    // 실제 PATCH 는 fkColumn(uuid) 으로 들어오므로 spec 을 직접 주입.
    'product_id':      { type: 'text', maxLength: 64 },
    'metal_price_id':  { type: 'text', maxLength: 64 },
    'bundle_id':       { type: 'text', maxLength: 64 },
    'purchase_id':     { type: 'text', maxLength: 64 },
  },
  page: 'order-items',
})

export const PATCH = createPatchRoute({
  table:      'order_items',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[order-items]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'order_items',
  logPrefix: '[order-items]',
})
