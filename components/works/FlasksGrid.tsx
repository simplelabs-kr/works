'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { flasksPageConfig } from '@/features/flasks/flasksConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function FlasksGrid() {
  const v = useRemountVersion(flasksPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={flasksPageConfig} />
}
