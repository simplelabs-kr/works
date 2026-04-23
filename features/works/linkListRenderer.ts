// Linklist 컬럼 렌더러 + 컬럼 설정 shape.
//
// linklist 는 한 row 가 여러 개 (또는 0~1개) 의 다른 row 를 "chip" 형태
// 로 가리키는 셀이다. 정방향 (fk → 1 개) 과 역방향 (1:N 의 역참조 → N 개)
// 모두 동일한 chip UI 로 표현한다.
//
// 실제 데이터:
//   - 정방향 (forward, N=1):  `{fkColumn}` 이 단일 uuid. 표시는 JOIN 으로
//     가져온 display 컬럼. flat_{table} 엔 display 컬럼만 있으므로
//     chip 1 개를 그리려면 `{display}` / `{fkColumn}` 를 함께 읽는다.
//   - 역방향 (reverse, N≥0): flat_{table} 에 JSONB 캐시 컬럼
//     (예: order_item_목록 = `[{id,display,secondary?}, ...]`) 을 두고,
//     트리거로 동기화. 여기서는 이 배열을 그대로 chip 으로 렌더.
//
// 현재 렌더러는 배열 (역방향) 만 처리한다. 정방향 칩 전환은 별도 단계
// 에서 bundlesConfig / repairsConfig 등에 `linkListConfig.mode = 'forward'`
// 로 선언하며 진행.

export type LinkListChip = {
  id: string
  display: string
  secondary?: string
}

export type LinkListConfig = {
  // 'reverse' — flat_{table} 의 JSONB 배열 컬럼을 그대로 렌더.
  // 'forward' — 단일 fk 컬럼을 읽어 1개짜리 chip 으로 렌더 (추후 단계).
  mode: 'reverse' | 'forward'

  // 팝오버의 후보 검색을 띄울 엔드포인트 (예: '/api/order_items').
  endpoint: string

  // 팝오버 표시 필드 (secondary 는 부가정보 1줄).
  displayField: string
  secondaryField?: string

  // 정방향일 때만 사용 — PATCH 대상 FK 컬럼.
  fkColumn?: string

  // 역방향일 때만 사용 — 상대 테이블의 FK 컬럼명 (역참조 PATCH 대상).
  // 예: bundles 에서 order_items 역참조 → order_items.bundle_id
  reverseFkColumn?: string
  // 역방향 상대 테이블명 (API 엔드포인트 prefix 와 동일 전제).
  reverseTable?: string
}

// 칩 셀 렌더러. 값이 `LinkListChip[]` 또는 JSON 문자열일 수 있어 방어적
// 으로 파싱한다. JSONB 가 Handsontable 까지 통과하면 string 으로 들어
// 올 수도 있다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseChips(value: any): LinkListChip[] {
  if (Array.isArray(value)) return value as LinkListChip[]
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed as LinkListChip[]
    } catch {
      /* fallthrough */
    }
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
