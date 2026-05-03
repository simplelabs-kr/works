'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { materialsPageConfig } from '@/features/materials/materialsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function MaterialsGrid() {
  const v = useRemountVersion(materialsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={materialsPageConfig} />
}
