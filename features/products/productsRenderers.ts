// Products 전용 select-column renderers.
//
// 공통 `renderSelectBadge` / `getSelectColumnOptions` 카탈로그를 그대로
// 활용한다 — products 배포 시점에 field_options 테이블로부터 `products`
// 스코프의 값이 로드되어 selectColumnOptions에 병합되도록 DataGrid의
// 기존 하이드레이션 경로를 재사용.

import { getSelectColumnOptions, renderSelectBadge } from '@/features/works/worksRenderers'

function makeSelectRenderer(field: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
    const bg = getSelectColumnOptions()[field]?.find(o => o.value === value)?.bg ?? ''
    renderSelectBadge(td, value, bg, true)
  }
}

export const 카테고리Renderer = makeSelectRenderer('카테고리')
export const 개발현황Renderer = makeSelectRenderer('개발_현황')
export const 마감잠금Renderer = makeSelectRenderer('마감_잠금')
export const 체류지Renderer = makeSelectRenderer('체류지')
