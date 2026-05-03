// Mold Positions (몰드 위치) grid configuration — flat_mold_positions.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { MoldPositionItem, MoldPositionRow } from './moldPositionsTypes'

export const MOLD_POSITIONS_VIEW_PAGE_KEY = 'mold-positions'

export const MOLD_POSITIONS_EDITABLE_FIELDS: Record<string, string> = {
  '보관함_위치': '보관함_위치',
  '동': '동',
  '레이어': '레이어',
  '셸프_칸': '셸프_칸',
  '줄': '줄',
  '열': '열',
  '위치': '위치',
}

export const MOLD_POSITIONS_COLUMNS = [
  { data: '보관함_위치', title: '보관함_위치', readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '동',         title: '동',         readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '레이어',     title: '레이어',     readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '셸프_칸',    title: '셸프_칸',    readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '줄',         title: '줄',         readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '열',         title: '열',         readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '위치',       title: '위치',       readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MOLD_POSITIONS_COL_HEADERS: string[] = (MOLD_POSITIONS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function transformMoldPositionRow(item: MoldPositionItem): MoldPositionRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    보관함_위치: str(item.보관함_위치),
    동: str(item.동),
    레이어: numOrNull(item.레이어),
    셸프_칸: numOrNull(item.셸프_칸),
    줄: numOrNull(item.줄),
    열: numOrNull(item.열),
    위치: numOrNull(item.위치),
  }
}

function moldPositionsMergeRealtimeUpdate(
  prev: MoldPositionRow,
  payloadNew: Record<string, unknown>,
): MoldPositionRow {
  const n = payloadNew
  return {
    ...prev,
    보관함_위치: n.보관함_위치 !== undefined ? str(n.보관함_위치) : prev.보관함_위치,
    동: n.동 !== undefined ? str(n.동) : prev.동,
    레이어: n.레이어 !== undefined ? numOrNull(n.레이어) : prev.레이어,
    셸프_칸: n.셸프_칸 !== undefined ? numOrNull(n.셸프_칸) : prev.셸프_칸,
    줄: n.줄 !== undefined ? numOrNull(n.줄) : prev.줄,
    열: n.열 !== undefined ? numOrNull(n.열) : prev.열,
    위치: n.위치 !== undefined ? numOrNull(n.위치) : prev.위치,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const moldPositionsPageConfig: PageConfig<MoldPositionItem, MoldPositionRow> = {
  pageKey: MOLD_POSITIONS_VIEW_PAGE_KEY,
  pageName: '몰드 위치',
  apiBase: '/api/mold-positions',
  realtimeChannel: 'mold_positions_changes',
  realtimeTable: 'flat_mold_positions',
  selectOptionsTable: 'mold_positions',
  columns: MOLD_POSITIONS_COLUMNS,
  colHeaders: MOLD_POSITIONS_COL_HEADERS,
  editableFields: MOLD_POSITIONS_EDITABLE_FIELDS,
  transformRow: transformMoldPositionRow,
  mergeRealtimeUpdate: moldPositionsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
