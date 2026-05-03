'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { stonesPageConfig } from '@/features/stones/stonesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function StonesGrid() {
  const v = useRemountVersion(stonesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={stonesPageConfig} />
}
