// 런타임 FIELD_SPECS 파생 헬퍼.
//
// 기존 3중 드리프트 (COLUMNS ↔ EDITABLE_FIELDS ↔ route.ts 의 FIELD_SPECS)
// 를 제거하기 위해, FIELD_SPECS 는 이제 라우트 모듈 로드 시점에
// 컬럼 카탈로그 + EDITABLE_FIELDS 로부터 파생한다. 직접 손으로 유지하지
// 않는다. 수작업 동기화가 필요하던 `scripts/generate-field-specs.mjs`
// 는 런타임 파생으로 대체되어 더 이상 필요하지 않다.
//
// 매핑 규칙:
//   col.fieldType === 'number'     → { type: 'number' }
//   col.fieldType === 'checkbox'   → { type: 'boolean' }
//   col.fieldType === 'date'       → { type: 'date' }
//   col.fieldType === 'attachment' → { type: 'attachment_list' }
//   col.fieldType === 'select'     →
//       col.enumValues 있음: { type: 'enum', values: col.enumValues }
//       없음:                 { type: 'text', maxLength: col.maxLength ?? 50 }
//   col.fieldType === 'longtext'   → { type: 'text', maxLength: col.maxLength ?? 2000 }
//   col.fieldType === 'text' | default → { type: 'text', maxLength: col.maxLength ?? 200 }
//
// `overrides` 로 특정 키의 spec 을 치환하거나, COLUMNS 에 없는 orphan
// 편집 키(예: 그리드 행동이 아닌 row-action 으로만 편집되는 'order_items.출고')
// 를 명시적으로 추가한다. 모든 EDITABLE_FIELDS 키는 columns 에서 발견되거나
// overrides 에 선언되어야 한다 — 아니면 모듈 로드 시 바로 throw 되어
// 드리프트를 runtime 에서 조기 감지한다.

import type { FieldSpec, FieldSpecs } from './createTableRoute'

// 외부 config 가 사용하는 컬럼 shape 중 spec 파생에 필요한 부분만.
export type SpecColumnLike = {
  data: string
  fieldType?: string
  maxLength?: number
  enumValues?: string[]
}

function columnToSpec(col: SpecColumnLike): FieldSpec {
  const ft = col.fieldType
  switch (ft) {
    case 'number':     return { type: 'number' }
    case 'checkbox':   return { type: 'boolean' }
    case 'date':       return { type: 'date' }
    case 'attachment': return { type: 'attachment_list' }
    case 'select':
      if (col.enumValues) return { type: 'enum', values: col.enumValues }
      return { type: 'text', maxLength: col.maxLength ?? 50 }
    case 'longtext':
      return { type: 'text', maxLength: col.maxLength ?? 2000 }
    case 'text':
    default:
      return { type: 'text', maxLength: col.maxLength ?? 200 }
  }
}

export type DeriveFieldSpecsOpts = {
  columns: readonly SpecColumnLike[]
  editableFields: Record<string, unknown>
  // COLUMNS 에 없는 편집 키 또는 자동 파생 spec 을 덮어쓸 때 사용.
  overrides?: FieldSpecs
  // 디버그용 — 에러 메시지에 표시.
  page?: string
}

export function deriveFieldSpecs(opts: DeriveFieldSpecsOpts): FieldSpecs {
  const { columns, editableFields, overrides = {}, page } = opts
  const label = page ? `[deriveFieldSpecs:${page}]` : '[deriveFieldSpecs]'
  const byData = new Map<string, SpecColumnLike>()
  for (const c of columns) byData.set(c.data, c)

  const out: FieldSpecs = {}
  for (const key of Object.keys(editableFields)) {
    if (overrides[key]) {
      out[key] = overrides[key]
      continue
    }
    const col = byData.get(key)
    if (!col) {
      throw new Error(
        `${label} key "${key}" is in editableFields but has no matching column entry and no override — ` +
        `add to COLUMNS or pass overrides: { "${key}": { ... } }`,
      )
    }
    out[key] = columnToSpec(col)
  }
  return out
}
