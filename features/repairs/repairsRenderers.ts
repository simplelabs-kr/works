// Repairs 전용 select-column renderers.
//
// 공통 `renderSelectBadge` / `getSelectColumnOptions` 카탈로그를 그대로
// 활용한다 — repairs 배포 시점에 field_options 테이블로부터 `repairs`
// 스코프의 값이 로드되어 selectColumnOptions에 병합되도록 DataGrid의
// 기존 하이드레이션 경로를 재사용. (products 페이지와 동일 패턴)
//
// 이 렌더러가 있어야 `renderSelectBadge(td, v, bg, true)` 가 td에
// `data-select-col="true"` 를 붙이고, 그에 따라 `.current::after` CSS
// 규칙이 셀 선택 시 chevron(▼) 을 그린다.

import { getSelectColumnOptions, renderSelectBadge } from '@/features/works/worksRenderers'

function makeSelectRenderer(field: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
    const bg = getSelectColumnOptions()[field]?.find(o => o.value === value)?.bg ?? ''
    renderSelectBadge(td, value, bg, true)
  }
}

export const 소재Renderer = makeSelectRenderer('소재')
export const 작업위치Renderer = makeSelectRenderer('작업_위치')
