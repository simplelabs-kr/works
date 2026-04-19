'use client'

// Products page용 얇은 래퍼. productsPageConfig를 DataGrid에 바인딩하고
// remount 버스의 버전을 key로 연결해 프리셋 적용 시 grid 만 리마운트되게
// 한다. 여기엔 페이지 고유 chrome(add-row 버튼 바 등)을 붙일 수 있도록
// 그리드 코어와 분리되어 있다.

import DataGrid from '@/components/datagrid/DataGrid'
import { productsPageConfig } from '@/features/products/productsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function ProductsGrid() {
  const v = useRemountVersion(productsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={productsPageConfig} />
}
