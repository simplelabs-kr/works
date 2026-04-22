import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { RENTALS_COLUMNS, RENTALS_EDITABLE_FIELDS } from '@/features/rentals/rentalsConfig'

export const maxDuration = 10

// FIELD_SPECS 는 rentalsConfig 의 COLUMNS + EDITABLE_FIELDS 로부터 파생.
// 드리프트 조기 감지 — EDITABLE_FIELDS 에 있는데 COLUMNS 에도 overrides
// 에도 없으면 모듈 로드 시 throw.
const FIELD_SPECS = deriveFieldSpecs({
  columns: RENTALS_COLUMNS as readonly SpecColumnLike[],
  editableFields: RENTALS_EDITABLE_FIELDS,
  // Link 컬럼의 FK (order_item_id / bundle_id) 는 COLUMNS 에 없는
  // orphan 편집 키 — UUID 형식(텍스트)으로 spec 을 주입한다.
  overrides: {
    order_item_id: { type: 'text', maxLength: 64 },
    bundle_id: { type: 'text', maxLength: 64 },
  },
  page: 'rentals',
})

// PATCH 는 rentals 원본 테이블을 직접 업데이트.
export const PATCH = createPatchRoute({
  table:      'rentals',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[rentals]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'rentals',
  logPrefix: '[rentals]',
})
