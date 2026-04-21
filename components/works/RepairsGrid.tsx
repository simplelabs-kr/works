'use client'

// Repairs page용 얇은 래퍼. repairsPageConfig 를 DataGrid 에 바인딩하고
// remount 버스의 버전을 key 로 연결해 프리셋 적용 시 grid 만 리마운트되게
// 한다.

import DataGrid from '@/components/datagrid/DataGrid'
import { repairsPageConfig } from '@/features/repairs/repairsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function RepairsGrid() {
  const v = useRemountVersion(repairsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={repairsPageConfig} />
}
