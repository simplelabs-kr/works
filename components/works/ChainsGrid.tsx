'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { chainsPageConfig } from '@/features/chains/chainsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function ChainsGrid() {
  const v = useRemountVersion(chainsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={chainsPageConfig} />
}
