'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { productMaterialsPageConfig } from '@/features/product-materials/productMaterialsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function ProductMaterialsGrid() {
  const v = useRemountVersion(productMaterialsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={productMaterialsPageConfig} />
}
