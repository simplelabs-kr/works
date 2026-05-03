// Flasks (깡/플라스크) grid configuration — flat_flasks.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { FlasksItem, FlasksRow } from './flasksTypes'

export const FLASKS_VIEW_PAGE_KEY = 'flasks'

export const FLASKS_EDITABLE_FIELDS: Record<string, string> = {
  '깡_번호': '깡_번호',
  '소재': '소재',
  '왁스_중량': '왁스_중량',
  '필요_합금_중량': '필요_합금_중량',
  '투입_기존합금': '투입_기존합금',
  '추가_필요_합금': '추가_필요_합금',
  '투입_순금_순은': '투입_순금_순은',
  '투입_총_합금': '투입_총_합금',
  '트리_완성일': '트리_완성일',
  '주물예정일': '주물예정일',
  '주물_절삭률': '주물_절삭률',
}

export const FLASKS_COLUMNS = [
  { data: '깡_번호',         title: '깡_번호',         readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '소재',            title: '소재',            readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '왁스_중량',       title: '왁스_중량',       readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '필요_합금_중량',  title: '필요_합금_중량',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '투입_기존합금',   title: '투입_기존합금',   readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가_필요_합금',  title: '추가_필요_합금',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '투입_순금_순은',  title: '투입_순금_순은',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '투입_총_합금',    title: '투입_총_합금',    readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '트리_완성일',     title: '트리_완성일',     readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '주물예정일',      title: '주물예정일',      readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '주물_절삭률',     title: '주물_절삭률',     readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLASKS_COL_HEADERS: string[] = (FLASKS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformFlasksRow(item: FlasksItem): FlasksRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    깡_번호: str(item.깡_번호),
    소재: str(item.소재),
    왁스_중량: numOrNull(item.왁스_중량),
    필요_합금_중량: numOrNull(item.필요_합금_중량),
    투입_기존합금: numOrNull(item.투입_기존합금),
    추가_필요_합금: numOrNull(item.추가_필요_합금),
    투입_순금_순은: numOrNull(item.투입_순금_순은),
    투입_총_합금: numOrNull(item.투입_총_합금),
    트리_완성일: dateOrEmpty(item.트리_완성일),
    주물예정일: dateOrEmpty(item.주물예정일),
    주물_절삭률: numOrNull(item.주물_절삭률),
  }
}

function flasksMergeRealtimeUpdate(
  prev: FlasksRow,
  payloadNew: Record<string, unknown>,
): FlasksRow {
  const n = payloadNew
  return {
    ...prev,
    깡_번호: n.깡_번호 !== undefined ? str(n.깡_번호) : prev.깡_번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    왁스_중량: n.왁스_중량 !== undefined ? numOrNull(n.왁스_중량) : prev.왁스_중량,
    필요_합금_중량: n.필요_합금_중량 !== undefined ? numOrNull(n.필요_합금_중량) : prev.필요_합금_중량,
    투입_기존합금: n.투입_기존합금 !== undefined ? numOrNull(n.투입_기존합금) : prev.투입_기존합금,
    추가_필요_합금: n.추가_필요_합금 !== undefined ? numOrNull(n.추가_필요_합금) : prev.추가_필요_합금,
    투입_순금_순은: n.투입_순금_순은 !== undefined ? numOrNull(n.투입_순금_순은) : prev.투입_순금_순은,
    투입_총_합금: n.투입_총_합금 !== undefined ? numOrNull(n.투입_총_합금) : prev.투입_총_합금,
    트리_완성일: n.트리_완성일 !== undefined ? dateOrEmpty(n.트리_완성일) : prev.트리_완성일,
    주물예정일: n.주물예정일 !== undefined ? dateOrEmpty(n.주물예정일) : prev.주물예정일,
    주물_절삭률: n.주물_절삭률 !== undefined ? numOrNull(n.주물_절삭률) : prev.주물_절삭률,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const flasksPageConfig: PageConfig<FlasksItem, FlasksRow> = {
  pageKey: FLASKS_VIEW_PAGE_KEY,
  pageName: '깡/플라스크',
  apiBase: '/api/flasks',
  realtimeChannel: 'flasks_changes',
  realtimeTable: 'flat_flasks',
  selectOptionsTable: 'flasks',
  columns: FLASKS_COLUMNS,
  colHeaders: FLASKS_COL_HEADERS,
  editableFields: FLASKS_EDITABLE_FIELDS,
  transformRow: transformFlasksRow,
  mergeRealtimeUpdate: flasksMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
