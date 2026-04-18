'use client'

// Thin wrapper that pins the generic DataGrid to the Works (flat_order_details)
// page config. Kept as its own component (rather than inlining DataGrid into
// app/works/page.tsx) so existing imports, dynamic-import splits, and future
// per-page chrome (add-row button bar, trash-mode controls, …) can attach
// here without touching the grid core.

import DataGrid from '@/components/datagrid/DataGrid'
import { worksPageConfig } from '@/features/works/worksConfig'

export default function WorksGrid() {
  return <DataGrid pageConfig={worksPageConfig} />
}
