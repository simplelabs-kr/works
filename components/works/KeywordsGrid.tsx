'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { keywordsPageConfig } from '@/features/keywords/keywordsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function KeywordsGrid() {
  const v = useRemountVersion(keywordsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={keywordsPageConfig} />
}
