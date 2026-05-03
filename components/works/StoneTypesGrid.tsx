'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { stoneTypesPageConfig } from '@/features/stone-types/stoneTypesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function StoneTypesGrid() {
  const v = useRemountVersion(stoneTypesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={stoneTypesPageConfig} />
}
