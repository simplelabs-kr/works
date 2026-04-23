// Linklist 컬럼 렌더러 + 컬럼 설정 shape.
//
// linklist 는 한 row 가 여러 개 (또는 0~1개) 의 다른 row 를 "chip" 형태
// 로 가리키는 셀이다. 정방향 (maxLinks=1, fk → 1개) 과 역방향
// (undefined, 1:N 의 역참조 → N개) 모두 동일한 chip UI 로 표현한다.
//
// 실제 데이터:
//   - 정방향 (forward, maxLinks=1):  `{fkColumn}` 이 단일 uuid. 표시는
//     flat_{table} 의 display 컬럼 (string). renderer 는 빈 문자열이
//     아니면 chip 1 개로 렌더.
//   - 역방향 (reverse, maxLinks 미지정): flat_{table} 에 JSONB 캐시 컬럼
//     (예: order_item_목록 = `[{id,display,secondary?}, ...]`) 을 두고,
//     트리거로 동기화. renderer 는 배열을 그대로 chip 으로 렌더.

export type LinkListChip = {
  id: string
  display: string
  secondary?: string
}

export type LinkListConfig = {
  // 후보 검색 API endpoint prefix (예: 'order-items' → '/api/order-items').
  linkTable: string

  // 정방향: 현재 row 의 FK 컬럼 (예: 'order_item_id'). PATCH 대상.
  // 역방향: 상대 테이블의 FK 컬럼 (예: order_items.bundle_id 의 'bundle_id').
  //         add/remove 시 `/api/{linkTable}/{chipId}` 에 `{field: fkColumn, value}` PATCH.
  fkColumn: string

  // 팝오버 표시 필드.
  displayField: string
  secondaryField?: string
  searchFields?: string[]

  // 정방향 (N=1) 이면 1 로 지정. 미지정이면 역방향 (N≥0).
  maxLinks?: number

  // 역방향 모드에서 JSONB 캐시 컬럼명 힌트 (기본값 = col.data).
  // 현재는 문서화 목적 — 런타임에선 col.data 를 사용.
  cacheField?: string
}

// 셀 값을 chip 배열로 정규화. JSONB 가 Handsontable 까지 string 으로
// 통과할 수 있어 방어적으로 파싱.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseChips(value: any): LinkListChip[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value as LinkListChip[]
  if (typeof value === 'string') {
    // JSON array string 이면 파싱, 아니면 단일 chip (forward 모드의 display 문자열).
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed as LinkListChip[]
      } catch {
        /* not a JSON array — treat as forward display string */
      }
    }
    return [{ id: '', display: value }]
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function linkListRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: any) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '2px 6px'
  td.style.position = 'relative'
  td.dataset.linklistCol = 'true'

  const chips = parseChips(value)

  const wrap = document.createElement('div')
  wrap.style.cssText =
    'display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow:hidden;height:100%;cursor:pointer;'

  if (chips.length === 0) {
    const empty = document.createElement('span')
    empty.style.cssText =
      'display:inline-flex;align-items:center;color:#9CA3AF;font-size:12px;gap:3px;'
    empty.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/></svg>'
    const label = document.createElement('span')
    label.textContent = '추가'
    empty.appendChild(label)
    wrap.appendChild(empty)
  } else {
    chips.forEach((chip) => {
      const el = document.createElement('span')
      el.style.cssText =
        'display:inline-flex;align-items:center;max-width:160px;padding:1px 7px;border-radius:10px;background:#EEF2FF;color:#3730A3;font-size:11.5px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;'
      el.textContent = chip.display || '(값 없음)'
      el.title = chip.secondary ? `${chip.display}\n${chip.secondary}` : chip.display
      wrap.appendChild(el)
    })
  }

  td.appendChild(wrap)
}
