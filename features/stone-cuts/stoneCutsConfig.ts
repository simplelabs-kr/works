// Stone Cuts (스톤 컷팅) grid configuration — flat_stone_cuts.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { StoneCutItem, StoneCutRow } from './stoneCutsTypes'

export const STONE_CUTS_VIEW_PAGE_KEY = 'stone-cuts'

export const STONE_CUTS_EDITABLE_FIELDS: Record<string, string> = {
  '컷팅': '컷팅',
}

export const STONE_CUTS_COLUMNS = [
  { data: '컷팅', title: '컷팅', readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STONE_CUTS_COL_HEADERS: string[] = (STONE_CUTS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function transformStoneCutRow(item: StoneCutItem): StoneCutRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    컷팅: str(item.컷팅),
  }
}

function stoneCutsMergeRealtimeUpdate(
  prev: StoneCutRow,
  payloadNew: Record<string, unknown>,
): StoneCutRow {
  const n = payloadNew
  return {
    ...prev,
    컷팅: n.컷팅 !== undefined ? str(n.컷팅) : prev.컷팅,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const stoneCutsPageConfig: PageConfig<StoneCutItem, StoneCutRow> = {
  pageKey: STONE_CUTS_VIEW_PAGE_KEY,
  pageName: '스톤 컷팅',
  apiBase: '/api/stone-cuts',
  realtimeChannel: 'stone_cuts_changes',
  realtimeTable: 'flat_stone_cuts',
  selectOptionsTable: 'stone_cuts',
  columns: STONE_CUTS_COLUMNS,
  colHeaders: STONE_CUTS_COL_HEADERS,
  editableFields: STONE_CUTS_EDITABLE_FIELDS,
  transformRow: transformStoneCutRow,
  mergeRealtimeUpdate: stoneCutsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
