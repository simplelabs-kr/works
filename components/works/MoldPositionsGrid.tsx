'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { moldPositionsPageConfig } from '@/features/mold-positions/moldPositionsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function MoldPositionsGrid() {
  const v = useRemountVersion(moldPositionsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={moldPositionsPageConfig} />
}
