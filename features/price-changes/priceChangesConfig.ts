// Price Changes (공임 변경) grid configuration — flat_price_changes.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { PriceChangeItem, PriceChangeRow } from './priceChangesTypes'

export const PRICE_CHANGES_VIEW_PAGE_KEY = 'price-changes'

export const PRICE_CHANGES_EDITABLE_FIELDS: Record<string, string> = {
  '공임_변경_공지일': '공임_변경_공지일',
  '공임_변경_적용일': '공임_변경_적용일',
  '전_공임': '전_공임',
  '후_공임': '후_공임',
  '조정액': '조정액',
}

export const PRICE_CHANGES_COLUMNS = [
  { data: '제품명',           title: '제품명',           readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '제품코드',         title: '제품코드',         readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '공임_변경_공지일', title: '공임_변경_공지일', readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '공임_변경_적용일', title: '공임_변경_적용일', readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '전_공임',          title: '전_공임',          readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_공임',          title: '후_공임',          readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '조정액',           title: '조정액',           readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRICE_CHANGES_COL_HEADERS: string[] = (PRICE_CHANGES_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformPriceChangeRow(item: PriceChangeItem): PriceChangeRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    공임_변경_공지일: dateOrEmpty(item.공임_변경_공지일),
    공임_변경_적용일: dateOrEmpty(item.공임_변경_적용일),
    전_공임: numOrNull(item.전_공임),
    후_공임: numOrNull(item.후_공임),
    조정액: numOrNull(item.조정액),
  }
}

function priceChangesMergeRealtimeUpdate(
  prev: PriceChangeRow,
  payloadNew: Record<string, unknown>,
): PriceChangeRow {
  const n = payloadNew
  return {
    ...prev,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    공임_변경_공지일: n.공임_변경_공지일 !== undefined ? dateOrEmpty(n.공임_변경_공지일) : prev.공임_변경_공지일,
    공임_변경_적용일: n.공임_변경_적용일 !== undefined ? dateOrEmpty(n.공임_변경_적용일) : prev.공임_변경_적용일,
    전_공임: n.전_공임 !== undefined ? numOrNull(n.전_공임) : prev.전_공임,
    후_공임: n.후_공임 !== undefined ? numOrNull(n.후_공임) : prev.후_공임,
    조정액: n.조정액 !== undefined ? numOrNull(n.조정액) : prev.조정액,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const priceChangesPageConfig: PageConfig<PriceChangeItem, PriceChangeRow> = {
  pageKey: PRICE_CHANGES_VIEW_PAGE_KEY,
  pageName: '공임 변경',
  apiBase: '/api/price-changes',
  realtimeChannel: 'price_changes_changes',
  realtimeTable: 'flat_price_changes',
  selectOptionsTable: 'price_changes',
  columns: PRICE_CHANGES_COLUMNS,
  colHeaders: PRICE_CHANGES_COL_HEADERS,
  editableFields: PRICE_CHANGES_EDITABLE_FIELDS,
  transformRow: transformPriceChangeRow,
  mergeRealtimeUpdate: priceChangesMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
