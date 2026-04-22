import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { BUNDLES_COLUMNS, BUNDLES_EDITABLE_FIELDS } from '@/features/bundles/bundlesConfig'

export const maxDuration = 10

// FIELD_SPECS 는 bundlesConfig 의 COLUMNS + EDITABLE_FIELDS 로부터 파생.
// 드리프트 조기 감지 — EDITABLE_FIELDS 에 있는데 COLUMNS 에도 overrides
// 에도 없으면 모듈 로드 시 throw.
const FIELD_SPECS = deriveFieldSpecs({
  columns: BUNDLES_COLUMNS as readonly SpecColumnLike[],
  editableFields: BUNDLES_EDITABLE_FIELDS,
  page: 'bundles',
})

// PATCH 는 bundles 원본 테이블을 직접 업데이트.
export const PATCH = createPatchRoute({
  table:      'bundles',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[bundles]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'bundles',
  logPrefix: '[bundles]',
})
