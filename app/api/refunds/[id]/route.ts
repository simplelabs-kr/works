import {
  createPatchRoute,
  createSoftDeleteRoute,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { REFUNDS_COLUMNS, REFUNDS_EDITABLE_FIELDS } from '@/features/refunds/refundsConfig'

export const maxDuration = 10

// FIELD_SPECS 는 refundsConfig 의 COLUMNS + EDITABLE_FIELDS 로부터 파생.
const FIELD_SPECS = deriveFieldSpecs({
  columns: REFUNDS_COLUMNS as readonly SpecColumnLike[],
  editableFields: REFUNDS_EDITABLE_FIELDS,
  page: 'refunds',
})

// PATCH 는 refunds 원본 테이블을 직접 업데이트.
export const PATCH = createPatchRoute({
  table:      'refunds',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[refunds]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'refunds',
  logPrefix: '[refunds]',
})
