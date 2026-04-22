import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { REPAIRS_COLUMNS, REPAIRS_EDITABLE_FIELDS } from '@/features/repairs/repairsConfig'

export const maxDuration = 10

// repairs 의 편집 가능 필드 명세는 repairsConfig 의 COLUMNS +
// REPAIRS_EDITABLE_FIELDS 로부터 런타임에 파생된다. route 에서 직접
// 손으로 관리하지 않는다 — 과거에 있던 3중 드리프트
// (COLUMNS ↔ EDITABLE_FIELDS ↔ FIELD_SPECS) 를 구조적으로 제거.
// COLUMNS 에 없는 orphan 편집 필드가 있으면 overrides 로 명시.
// PATCH 는 flat_repairs 가 아닌 repairs 원본 테이블을 직접 업데이트한다
// (flat_repairs 는 트리거가 동기화).
const FIELD_SPECS = deriveFieldSpecs({
  columns: REPAIRS_COLUMNS as readonly SpecColumnLike[],
  editableFields: REPAIRS_EDITABLE_FIELDS,
  page: 'repairs',
})

export const PATCH = createPatchRoute({
  table:      'repairs',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[repairs]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'repairs',
  logPrefix: '[repairs]',
})
