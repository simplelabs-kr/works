// Sprue Weights (뽕대 중량) grid configuration — flat_sprue_weights.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { SprueWeightsItem, SprueWeightsRow } from './sprueWeightsTypes'

export const SPRUE_WEIGHTS_VIEW_PAGE_KEY = 'sprue-weights'

export const SPRUE_WEIGHTS_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '소재': '소재',
  '종류': '종류',
  '주물일': '주물일',
  '금_투입일': '금_투입일',
  '중량_합금': '중량_합금',
  '함량비': '함량비',
  '중량_순금': '중량_순금',
}

export const SPRUE_WEIGHTS_COLUMNS = [
  { data: '고유번호',  title: '고유번호',  readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '소재',      title: '소재',      readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '종류',      title: '종류',      readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '주물일',    title: '주물일',    readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '금_투입일', title: '금_투입일', readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '중량_합금', title: '중량_합금', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',    title: '함량비',    readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '중량_순금', title: '중량_순금', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SPRUE_WEIGHTS_COL_HEADERS: string[] = (SPRUE_WEIGHTS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformSprueWeightsRow(item: SprueWeightsItem): SprueWeightsRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    소재: str(item.소재),
    종류: str(item.종류),
    주물일: dateOrEmpty(item.주물일),
    금_투입일: dateOrEmpty(item.금_투입일),
    중량_합금: numOrNull(item.중량_합금),
    함량비: numOrNull(item.함량비),
    중량_순금: numOrNull(item.중량_순금),
  }
}

function sprueWeightsMergeRealtimeUpdate(
  prev: SprueWeightsRow,
  payloadNew: Record<string, unknown>,
): SprueWeightsRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    종류: n.종류 !== undefined ? str(n.종류) : prev.종류,
    주물일: n.주물일 !== undefined ? dateOrEmpty(n.주물일) : prev.주물일,
    금_투입일: n.금_투입일 !== undefined ? dateOrEmpty(n.금_투입일) : prev.금_투입일,
    중량_합금: n.중량_합금 !== undefined ? numOrNull(n.중량_합금) : prev.중량_합금,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    중량_순금: n.중량_순금 !== undefined ? numOrNull(n.중량_순금) : prev.중량_순금,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const sprueWeightsPageConfig: PageConfig<SprueWeightsItem, SprueWeightsRow> = {
  pageKey: SPRUE_WEIGHTS_VIEW_PAGE_KEY,
  pageName: '뽕대 중량',
  apiBase: '/api/sprue-weights',
  realtimeChannel: 'sprue_weights_changes',
  realtimeTable: 'flat_sprue_weights',
  selectOptionsTable: 'sprue_weights',
  columns: SPRUE_WEIGHTS_COLUMNS,
  colHeaders: SPRUE_WEIGHTS_COL_HEADERS,
  editableFields: SPRUE_WEIGHTS_EDITABLE_FIELDS,
  transformRow: transformSprueWeightsRow,
  mergeRealtimeUpdate: sprueWeightsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
