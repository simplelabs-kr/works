'use client'

// Refunds page 래퍼. refundsPageConfig 를 DataGrid 에 바인딩.

import DataGrid from '@/components/datagrid/DataGrid'
import { refundsPageConfig } from '@/features/refunds/refundsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function RefundsGrid() {
  const v = useRemountVersion(refundsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={refundsPageConfig} />
}
