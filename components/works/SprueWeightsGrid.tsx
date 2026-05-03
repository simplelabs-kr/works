'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { sprueWeightsPageConfig } from '@/features/sprue-weights/sprueWeightsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function SprueWeightsGrid() {
  const v = useRemountVersion(sprueWeightsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={sprueWeightsPageConfig} />
}
