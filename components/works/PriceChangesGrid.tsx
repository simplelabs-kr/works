'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { priceChangesPageConfig } from '@/features/price-changes/priceChangesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function PriceChangesGrid() {
  const v = useRemountVersion(priceChangesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={priceChangesPageConfig} />
}
