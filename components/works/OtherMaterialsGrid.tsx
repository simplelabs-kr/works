'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { otherMaterialsPageConfig } from '@/features/other-materials/otherMaterialsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function OtherMaterialsGrid() {
  const v = useRemountVersion(otherMaterialsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={otherMaterialsPageConfig} />
}
