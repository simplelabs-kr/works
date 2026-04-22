'use client'

// Bundles page 래퍼. bundlesPageConfig 를 DataGrid 에 바인딩하고 remount
// 버스의 버전을 key 로 연결해 프리셋 적용 시 grid 만 리마운트되게 한다.

import DataGrid from '@/components/datagrid/DataGrid'
import { bundlesPageConfig } from '@/features/bundles/bundlesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function BundlesGrid() {
  const v = useRemountVersion(bundlesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={bundlesPageConfig} />
}
