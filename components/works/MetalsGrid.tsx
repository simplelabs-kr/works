'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { metalsPageConfig } from '@/features/metals/metalsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function MetalsGrid() {
  const v = useRemountVersion(metalsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={metalsPageConfig} />
}
