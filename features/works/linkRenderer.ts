// Link 컬럼 렌더러 + 컬럼 설정 shape.
//
// 링크 컬럼은 "다른 테이블의 특정 row 를 이 row 에 연결" 하는 셀이다.
// - 셀에 보이는 값은 피연결 row 의 display 필드 (예: 제품명).
// - 실제 PATCH payload 는 FK 컬럼 (예: product_id) 의 UUID.
// - 클릭 시 검색 팝오버를 열어 피연결 row 를 고르면, fkColumn 을 PATCH
//   하고 displayField 를 낙관적으로 업데이트한다. 실패 시 롤백.
//
// 암묵적 계약:
//   - `readOnly: true` (display 셀 직접 편집 금지 — 팝오버 경유만 허용)
//   - EDITABLE_FIELDS 에 `fkColumn` 을 등록하거나 route 의 overrides 에 선언
//   - linkTable 은 `/api/{linkTable}` POST 가 `search_term` / `filters` / `offset` 을
//     받는 (createListRoute 계약) 테이블이어야 함

export type LinkConfig = {
  // 링크 대상 테이블 — POST `/api/{linkTable}` 이 search RPC 기반 목록을 반환.
  linkTable: string
  // 실제 PATCH 대상 FK 컬럼 (현재 테이블의 uuid 필드).
  fkColumn: string
  // 팝오버에서 검색어 매칭을 시각화할 필드들 (단순 표시용).
  searchFields?: string[]
  // 팝오버 결과 리스트의 주/부 라인에 쓸 필드명.
  displayField: string
  secondaryField?: string
}

// 링크 셀 렌더러 — 값 + 우측 링크 아이콘을 함께 그린다.
// data-link-col='true' 를 달아 CSS 훅이 필요하면 나중에 스타일링 가능.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function linkRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  td.style.position = 'relative'
  td.dataset.linkCol = 'true'

  const wrap = document.createElement('span')
  wrap.style.cssText =
    'display:inline-flex;align-items:center;gap:6px;line-height:normal;cursor:pointer;'

  const text = document.createElement('span')
  text.textContent = value ?? ''
  text.style.cssText =
    'font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
  wrap.appendChild(text)

  const icon = document.createElement('span')
  // 외부 링크/검색 느낌의 아이콘. 가볍게.
  icon.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#94A3B8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="3"/><line x1="7.2" y1="7.2" x2="9.5" y2="9.5"/></svg>'
  icon.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0;'
  wrap.appendChild(icon)

  td.appendChild(wrap)
}
