'use client'

// Thin wrapper that pins the generic DataGrid to the Works (flat_order_details)
// page config. Kept as its own component (rather than inlining DataGrid into
// app/works/page.tsx) so existing imports, dynamic-import splits, and future
// per-page chrome (add-row button bar, trash-mode controls, …) can attach
// here without touching the grid core.
//
// Reads the per-pageKey remount version from the remount bus and threads
// it through as <DataGrid key=...>. applyPreset bumps that version when
// the user picks a preset for this page, which remounts the grid so its
// mount-restore effect re-reads the just-cached settings — without
// tearing down the surrounding WorksShell/LNB.

import DataGrid from '@/components/datagrid/DataGrid'
import { worksPageConfig } from '@/features/works/worksConfig'
import { useRemountVersion } from '@/lib/works/remountBus'

export default function WorksGrid() {
  const v = useRemountVersion(worksPageConfig.pageKey)
  return <DataGrid key={v} pageConfig={worksPageConfig} />
}
