'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { moldsPageConfig } from '@/features/molds/moldsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function MoldsGrid() {
  const v = useRemountVersion(moldsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={moldsPageConfig} />
}
