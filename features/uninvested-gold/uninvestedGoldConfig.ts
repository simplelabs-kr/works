// Uninvested Gold (미투자 금) grid configuration — flat_uninvested_gold.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { UninvestedGoldItem, UninvestedGoldRow } from './uninvestedGoldTypes'

export const UNINVESTED_GOLD_VIEW_PAGE_KEY = 'uninvested-gold'

export const UNINVESTED_GOLD_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '소재': '소재',
  '날짜': '날짜',
  '중량_합금': '중량_합금',
  '함량비': '함량비',
  '중량_순금': '중량_순금',
}

export const UNINVESTED_GOLD_COLUMNS = [
  { data: '고유번호',  title: '고유번호',  readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '소재',      title: '소재',      readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '날짜',      title: '날짜',      readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '중량_합금', title: '중량_합금', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',    title: '함량비',    readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '중량_순금', title: '중량_순금', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UNINVESTED_GOLD_COL_HEADERS: string[] = (UNINVESTED_GOLD_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function transformUninvestedGoldRow(item: UninvestedGoldItem): UninvestedGoldRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    소재: str(item.소재),
    날짜: dateOrEmpty(item.날짜),
    중량_합금: numOrNull(item.중량_합금),
    함량비: numOrNull(item.함량비),
    중량_순금: numOrNull(item.중량_순금),
  }
}

function uninvestedGoldMergeRealtimeUpdate(
  prev: UninvestedGoldRow,
  payloadNew: Record<string, unknown>,
): UninvestedGoldRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    날짜: n.날짜 !== undefined ? dateOrEmpty(n.날짜) : prev.날짜,
    중량_합금: n.중량_합금 !== undefined ? numOrNull(n.중량_합금) : prev.중량_합금,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    중량_순금: n.중량_순금 !== undefined ? numOrNull(n.중량_순금) : prev.중량_순금,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const uninvestedGoldPageConfig: PageConfig<UninvestedGoldItem, UninvestedGoldRow> = {
  pageKey: UNINVESTED_GOLD_VIEW_PAGE_KEY,
  pageName: '미투자 금',
  apiBase: '/api/uninvested-gold',
  realtimeChannel: 'uninvested_gold_changes',
  realtimeTable: 'flat_uninvested_gold',
  selectOptionsTable: 'uninvested_gold',
  columns: UNINVESTED_GOLD_COLUMNS,
  colHeaders: UNINVESTED_GOLD_COL_HEADERS,
  editableFields: UNINVESTED_GOLD_EDITABLE_FIELDS,
  transformRow: transformUninvestedGoldRow,
  mergeRealtimeUpdate: uninvestedGoldMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
