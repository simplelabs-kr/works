'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { uninvestedGoldPageConfig } from '@/features/uninvested-gold/uninvestedGoldConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function UninvestedGoldGrid() {
  const v = useRemountVersion(uninvestedGoldPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={uninvestedGoldPageConfig} />
}
