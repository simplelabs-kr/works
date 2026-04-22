// Refunds select-column renderers.
//
// `반품_구분` 값은 field_options(table_name='refunds') 에서 로드되어
// 공통 selectColumnOptions 맵으로 머지된다.

import { getSelectColumnOptions, renderSelectBadge } from '@/features/works/worksRenderers'

function makeSelectRenderer(field: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
    const bg = getSelectColumnOptions()[field]?.find(o => o.value === value)?.bg ?? ''
    renderSelectBadge(td, value, bg, true)
  }
}

export const 반품구분Renderer = makeSelectRenderer('반품_구분')
