'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { cuttingFieldPageConfig } from '@/features/cutting-field/cuttingFieldConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function CuttingFieldGrid() {
  const v = useRemountVersion(cuttingFieldPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={cuttingFieldPageConfig} />
}
