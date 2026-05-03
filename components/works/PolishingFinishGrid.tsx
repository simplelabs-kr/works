'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { polishingFinishPageConfig } from '@/features/polishing-finish/polishingFinishConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function PolishingFinishGrid() {
  const v = useRemountVersion(polishingFinishPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={polishingFinishPageConfig} />
}
