'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { cuttingWheelPageConfig } from '@/features/cutting-wheel/cuttingWheelConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function CuttingWheelGrid() {
  const v = useRemountVersion(cuttingWheelPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={cuttingWheelPageConfig} />
}
