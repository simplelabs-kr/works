'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { polishingRoughPageConfig } from '@/features/polishing-rough/polishingRoughConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function PolishingRoughGrid() {
  const v = useRemountVersion(polishingRoughPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={polishingRoughPageConfig} />
}
