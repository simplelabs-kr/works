'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { claimsPageConfig } from '@/features/claims/claimsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function ClaimsGrid() {
  const v = useRemountVersion(claimsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={claimsPageConfig} />
}
