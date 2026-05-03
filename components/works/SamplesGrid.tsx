'use client'

import DataGrid from '@/components/datagrid/DataGrid'
import { samplesPageConfig } from '@/features/samples/samplesConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function SamplesGrid() {
  const v = useRemountVersion(samplesPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={samplesPageConfig} />
}
