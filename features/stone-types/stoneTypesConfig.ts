// Stone Types (스톤 종류) grid configuration — flat_stone_types.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { StoneTypeItem, StoneTypeRow } from './stoneTypesTypes'

export const STONE_TYPES_VIEW_PAGE_KEY = 'stone-types'

export const STONE_TYPES_EDITABLE_FIELDS: Record<string, string> = {
  '명칭': '명칭',
  '비고': '비고',
}

export const STONE_TYPES_COLUMNS = [
  { data: '명칭', title: '명칭', readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '비고', title: '비고', readOnly: false, width: 200, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STONE_TYPES_COL_HEADERS: string[] = (STONE_TYPES_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function transformStoneTypeRow(item: StoneTypeItem): StoneTypeRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    명칭: str(item.명칭),
    비고: str(item.비고),
  }
}

function stoneTypesMergeRealtimeUpdate(
  prev: StoneTypeRow,
  payloadNew: Record<string, unknown>,
): StoneTypeRow {
  const n = payloadNew
  return {
    ...prev,
    명칭: n.명칭 !== undefined ? str(n.명칭) : prev.명칭,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const stoneTypesPageConfig: PageConfig<StoneTypeItem, StoneTypeRow> = {
  pageKey: STONE_TYPES_VIEW_PAGE_KEY,
  pageName: '스톤 종류',
  apiBase: '/api/stone-types',
  realtimeChannel: 'stone_types_changes',
  realtimeTable: 'flat_stone_types',
  selectOptionsTable: 'stone_types',
  columns: STONE_TYPES_COLUMNS,
  colHeaders: STONE_TYPES_COL_HEADERS,
  editableFields: STONE_TYPES_EDITABLE_FIELDS,
  transformRow: transformStoneTypeRow,
  mergeRealtimeUpdate: stoneTypesMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
