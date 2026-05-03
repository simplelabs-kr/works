// Cutting Wheel (절삭 - 휠) grid configuration — flat_cutting_wheel.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { CuttingWheelItem, CuttingWheelRow } from './cuttingWheelTypes'

export const CUTTING_WHEEL_VIEW_PAGE_KEY = 'cutting-wheel'

export const CUTTING_WHEEL_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '소재': '소재',
  '번호': '번호',
  '작업일': '작업일',
  '전_합금': '전_합금',
  '후_합금': '후_합금',
  '절삭량_합금': '절삭량_합금',
  '절삭률': '절삭률',
  '함량비': '함량비',
  '절삭량_순금': '절삭량_순금',
}

export const CUTTING_WHEEL_COLUMNS = [
  { data: '고유번호',    title: '고유번호',    readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '소재',        title: '소재',        readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '번호',        title: '번호',        readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '작업일',      title: '작업일',      readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '전_합금',     title: '전_합금',     readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_합금',     title: '후_합금',     readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭량_합금', title: '절삭량_합금', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭률',      title: '절삭률',      readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',      title: '함량비',      readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭량_순금', title: '절삭량_순금', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CUTTING_WHEEL_COL_HEADERS: string[] = (CUTTING_WHEEL_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformCuttingWheelRow(item: CuttingWheelItem): CuttingWheelRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    소재: str(item.소재),
    번호: str(item.번호),
    작업일: dateOrEmpty(item.작업일),
    전_합금: numOrNull(item.전_합금),
    후_합금: numOrNull(item.후_합금),
    절삭량_합금: numOrNull(item.절삭량_합금),
    절삭률: numOrNull(item.절삭률),
    함량비: numOrNull(item.함량비),
    절삭량_순금: numOrNull(item.절삭량_순금),
  }
}

function cuttingWheelMergeRealtimeUpdate(
  prev: CuttingWheelRow,
  payloadNew: Record<string, unknown>,
): CuttingWheelRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    번호: n.번호 !== undefined ? str(n.번호) : prev.번호,
    작업일: n.작업일 !== undefined ? dateOrEmpty(n.작업일) : prev.작업일,
    전_합금: n.전_합금 !== undefined ? numOrNull(n.전_합금) : prev.전_합금,
    후_합금: n.후_합금 !== undefined ? numOrNull(n.후_합금) : prev.후_합금,
    절삭량_합금: n.절삭량_합금 !== undefined ? numOrNull(n.절삭량_합금) : prev.절삭량_합금,
    절삭률: n.절삭률 !== undefined ? numOrNull(n.절삭률) : prev.절삭률,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    절삭량_순금: n.절삭량_순금 !== undefined ? numOrNull(n.절삭량_순금) : prev.절삭량_순금,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const cuttingWheelPageConfig: PageConfig<CuttingWheelItem, CuttingWheelRow> = {
  pageKey: CUTTING_WHEEL_VIEW_PAGE_KEY,
  pageName: '절삭 - 휠',
  apiBase: '/api/cutting-wheel',
  realtimeChannel: 'cutting_wheel_changes',
  realtimeTable: 'flat_cutting_wheel',
  selectOptionsTable: 'cutting_wheel',
  columns: CUTTING_WHEEL_COLUMNS,
  colHeaders: CUTTING_WHEEL_COL_HEADERS,
  editableFields: CUTTING_WHEEL_EDITABLE_FIELDS,
  transformRow: transformCuttingWheelRow,
  mergeRealtimeUpdate: cuttingWheelMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
