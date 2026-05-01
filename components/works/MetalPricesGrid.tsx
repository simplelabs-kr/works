'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { metalPricesPageConfig } from '@/features/metal-prices/metalPricesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function MetalPricesGrid() {
  const v = useRemountVersion(metalPricesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={metalPricesPageConfig} />
}
