'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { brandsPageConfig } from '@/features/brands/brandsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function BrandsGrid() {
  const v = useRemountVersion(brandsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={brandsPageConfig} />
}
