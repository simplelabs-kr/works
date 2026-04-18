'use client'

// Trash-view wrapper — pins the generic DataGrid to the trashed variant
// of worksPageConfig. Kept in its own file to match WorksGrid.tsx's
// pattern (thin page-level wrapper; generic DataGrid does all the work).

import DataGrid from '@/components/datagrid/DataGrid'
import { worksTrashPageConfig } from '@/features/works/worksConfig'

export default function WorksTrashGrid() {
  return <DataGrid pageConfig={worksTrashPageConfig} />
}
