'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { dustCollectionPageConfig } from '@/features/dust-collection/dustCollectionConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function DustCollectionGrid() {
  const v = useRemountVersion(dustCollectionPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={dustCollectionPageConfig} />
}
