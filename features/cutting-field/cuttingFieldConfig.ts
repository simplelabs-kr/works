// Cutting Field (절삭 - 필드) grid configuration — flat_cutting_field.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { CuttingFieldItem, CuttingFieldRow } from './cuttingFieldTypes'

export const CUTTING_FIELD_VIEW_PAGE_KEY = 'cutting-field'

export const CUTTING_FIELD_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '소재': '소재',
  '번호': '번호',
  '주물일': '주물일',
  '작업일': '작업일',
  '전_합금': '전_합금',
  '후_합금_제품': '후_합금_제품',
  '후_합금_뽕대': '후_합금_뽕대',
  '함량비': '함량비',
  '절삭량_순금': '절삭량_순금',
  '절삭률': '절삭률',
}

export const CUTTING_FIELD_COLUMNS = [
  { data: '고유번호',     title: '고유번호',     readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '소재',         title: '소재',         readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '번호',         title: '번호',         readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '주물일',       title: '주물일',       readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '작업일',       title: '작업일',       readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '전_합금',      title: '전_합금',      readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_합금_제품', title: '후_합금_제품', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_합금_뽕대', title: '후_합금_뽕대', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',       title: '함량비',       readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭량_순금',  title: '절삭량_순금',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭률',       title: '절삭률',       readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CUTTING_FIELD_COL_HEADERS: string[] = (CUTTING_FIELD_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformCuttingFieldRow(item: CuttingFieldItem): CuttingFieldRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    소재: str(item.소재),
    번호: str(item.번호),
    주물일: dateOrEmpty(item.주물일),
    작업일: dateOrEmpty(item.작업일),
    전_합금: numOrNull(item.전_합금),
    후_합금_제품: numOrNull(item.후_합금_제품),
    후_합금_뽕대: numOrNull(item.후_합금_뽕대),
    함량비: numOrNull(item.함량비),
    절삭량_순금: numOrNull(item.절삭량_순금),
    절삭률: numOrNull(item.절삭률),
  }
}

function cuttingFieldMergeRealtimeUpdate(
  prev: CuttingFieldRow,
  payloadNew: Record<string, unknown>,
): CuttingFieldRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    번호: n.번호 !== undefined ? str(n.번호) : prev.번호,
    주물일: n.주물일 !== undefined ? dateOrEmpty(n.주물일) : prev.주물일,
    작업일: n.작업일 !== undefined ? dateOrEmpty(n.작업일) : prev.작업일,
    전_합금: n.전_합금 !== undefined ? numOrNull(n.전_합금) : prev.전_합금,
    후_합금_제품: n.후_합금_제품 !== undefined ? numOrNull(n.후_합금_제품) : prev.후_합금_제품,
    후_합금_뽕대: n.후_합금_뽕대 !== undefined ? numOrNull(n.후_합금_뽕대) : prev.후_합금_뽕대,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    절삭량_순금: n.절삭량_순금 !== undefined ? numOrNull(n.절삭량_순금) : prev.절삭량_순금,
    절삭률: n.절삭률 !== undefined ? numOrNull(n.절삭률) : prev.절삭률,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const cuttingFieldPageConfig: PageConfig<CuttingFieldItem, CuttingFieldRow> = {
  pageKey: CUTTING_FIELD_VIEW_PAGE_KEY,
  pageName: '절삭 - 필드',
  apiBase: '/api/cutting-field',
  realtimeChannel: 'cutting_field_changes',
  realtimeTable: 'flat_cutting_field',
  selectOptionsTable: 'cutting_field',
  columns: CUTTING_FIELD_COLUMNS,
  colHeaders: CUTTING_FIELD_COL_HEADERS,
  editableFields: CUTTING_FIELD_EDITABLE_FIELDS,
  transformRow: transformCuttingFieldRow,
  mergeRealtimeUpdate: cuttingFieldMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
