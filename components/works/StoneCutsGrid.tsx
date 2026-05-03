'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { stoneCutsPageConfig } from '@/features/stone-cuts/stoneCutsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function StoneCutsGrid() {
  const v = useRemountVersion(stoneCutsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={stoneCutsPageConfig} />
}
