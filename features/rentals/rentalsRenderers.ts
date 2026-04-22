// Rentals select-column renderers.
//
// `현황` 값은 field_options(table_name='rentals') 에서 로드되어 공통
// selectColumnOptions 맵으로 머지된다. 이 렌더러가 `data-select-col`
// dataset 을 붙여야 현재 셀에 chevron (▼) 이 그려진다 (repairs 와 동일
// 패턴).

import { getSelectColumnOptions, renderSelectBadge } from '@/features/works/worksRenderers'

function makeSelectRenderer(field: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
    const bg = getSelectColumnOptions()[field]?.find(o => o.value === value)?.bg ?? ''
    renderSelectBadge(td, value, bg, true)
  }
}

export const 현황Renderer = makeSelectRenderer('현황')
