'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { castingInputsPageConfig } from '@/features/casting-inputs/castingInputsConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function CastingInputsGrid() {
  const v = useRemountVersion(castingInputsPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={castingInputsPageConfig} />
}
