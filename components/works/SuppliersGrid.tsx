'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { suppliersPageConfig } from '@/features/suppliers/suppliersConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function SuppliersGrid() {
  const v = useRemountVersion(suppliersPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={suppliersPageConfig} />
}
