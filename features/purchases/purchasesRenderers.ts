// Purchases (매입) cell renderers.
//
// 소재: lookup 컬럼 (readOnly) — 값 자체는 order_items 의 첫 연결 row 에서
// 트리거가 sync. select 와 동일한 컬러 뱃지로 표시하기 위해 page 가
// `field_options(table_name='order_items', field_name='소재')` 카탈로그를
// 추가로 hydrate (purchasesPageConfig.extraSelectOptionsTables) — 카탈로그는
// field_name 기준으로 통합되므로 col.data='소재' 가 그대로 키로 매칭된다.

import { getSelectColumnOptions, renderSelectBadge } from '@/features/works/worksRenderers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function 소재LookupRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = getSelectColumnOptions()['소재']?.find(o => o.value === value)?.bg ?? ''
  // editable=false — readOnly lookup 이므로 click-to-edit 마커 미부착.
  renderSelectBadge(td, value, bg, false)
}

// 생성일시: created_at ISO 타임스탬프를 'YYYY-MM-DD HH:mm' 로 표시.
// row 값은 raw ISO 를 유지하지 않고 transform 단계에서 미리 포맷한 문자열을
// 넣지만, 헤더 sort/filter 는 형식이 그대로 lexicographic 비교 가능하므로
// 정렬·필터 동작에 영향 없다.
export function formatCreatedAt(val: string | null | undefined): string {
  if (!val) return ''
  // '2025-12-01T12:34:56.789+00:00' → '2025-12-01 12:34'
  const s = String(val)
  const date = s.slice(0, 10)
  const time = s.slice(11, 16)
  return time ? `${date} ${time}` : date
}
