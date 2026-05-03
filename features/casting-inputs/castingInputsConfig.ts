// Casting Inputs (금 투입) grid configuration — flat_casting_inputs.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { CastingInputItem, CastingInputRow } from './castingInputsTypes'

export const CASTING_INPUTS_VIEW_PAGE_KEY = 'casting-inputs'

export const CASTING_INPUTS_EDITABLE_FIELDS: Record<string, string> = {
  '깡_번호': '깡_번호',
  '소재': '소재',
  '금_투입일': '금_투입일',
  '주물일': '주물일',
  '투입_합금': '투입_합금',
  '투입_순금': '투입_순금',
  '함량비': '함량비',
  '총_투입_순금': '총_투입_순금',
}

export const CASTING_INPUTS_COLUMNS = [
  { data: '깡_번호',     title: '깡_번호',     readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '소재',        title: '소재',        readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '금_투입일',   title: '금_투입일',   readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '주물일',      title: '주물일',      readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '투입_합금',   title: '투입_합금',   readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '투입_순금',   title: '투입_순금',   readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',      title: '함량비',      readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '총_투입_순금', title: '총_투입_순금', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CASTING_INPUTS_COL_HEADERS: string[] = (CASTING_INPUTS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformCastingInputRow(item: CastingInputItem): CastingInputRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    깡_번호: str(item.깡_번호),
    소재: str(item.소재),
    금_투입일: dateOrEmpty(item.금_투입일),
    주물일: dateOrEmpty(item.주물일),
    투입_합금: numOrNull(item.투입_합금),
    투입_순금: numOrNull(item.투입_순금),
    함량비: numOrNull(item.함량비),
    총_투입_순금: numOrNull(item.총_투입_순금),
  }
}

function castingInputsMergeRealtimeUpdate(
  prev: CastingInputRow,
  payloadNew: Record<string, unknown>,
): CastingInputRow {
  const n = payloadNew
  return {
    ...prev,
    깡_번호: n.깡_번호 !== undefined ? str(n.깡_번호) : prev.깡_번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    금_투입일: n.금_투입일 !== undefined ? dateOrEmpty(n.금_투입일) : prev.금_투입일,
    주물일: n.주물일 !== undefined ? dateOrEmpty(n.주물일) : prev.주물일,
    투입_합금: n.투입_합금 !== undefined ? numOrNull(n.투입_합금) : prev.투입_합금,
    투입_순금: n.투입_순금 !== undefined ? numOrNull(n.투입_순금) : prev.투입_순금,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    총_투입_순금: n.총_투입_순금 !== undefined ? numOrNull(n.총_투입_순금) : prev.총_투입_순금,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const castingInputsPageConfig: PageConfig<CastingInputItem, CastingInputRow> = {
  pageKey: CASTING_INPUTS_VIEW_PAGE_KEY,
  pageName: '금 투입',
  apiBase: '/api/casting-inputs',
  realtimeChannel: 'casting_inputs_changes',
  realtimeTable: 'flat_casting_inputs',
  selectOptionsTable: 'casting_inputs',
  columns: CASTING_INPUTS_COLUMNS,
  colHeaders: CASTING_INPUTS_COL_HEADERS,
  editableFields: CASTING_INPUTS_EDITABLE_FIELDS,
  transformRow: transformCastingInputRow,
  mergeRealtimeUpdate: castingInputsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
