'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { purchasesPageConfig } from '@/features/purchases/purchasesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function PurchasesGrid() {
  const v = useRemountVersion(purchasesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={purchasesPageConfig} />
}
