// Chains (체인) grid configuration — flat_chains.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { ChainItem, ChainRow } from './chainsTypes'

export const CHAINS_VIEW_PAGE_KEY = 'chains'

export const CHAINS_EDITABLE_FIELDS: Record<string, string> = {
  '체인명': '체인명',
  '품번': '품번',
  '소재': '소재',
  '중량_50cm': '중량_50cm',
  '매입가격_50cm': '매입가격_50cm',
  '공임_50cm': '공임_50cm',
  '비고': '비고',
}

export const CHAINS_COLUMNS = [
  { data: '체인명',         title: '체인명',         readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: 'supplier_이름',  title: 'supplier_이름',  readOnly: true,  width: 120, fieldType: 'lookup' as FieldType },
  { data: '품번',           title: '품번',           readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '소재',           title: '소재',           readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '중량_50cm',      title: '중량_50cm',      readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '매입가격_50cm',  title: '매입가격_50cm',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '공임_50cm',      title: '공임_50cm',      readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '비고',           title: '비고',           readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAINS_COL_HEADERS: string[] = (CHAINS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function transformChainRow(item: ChainItem): ChainRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    체인명: str(item.체인명),
    supplier_이름: str(item.supplier_이름),
    품번: str(item.품번),
    소재: str(item.소재),
    중량_50cm: numOrNull(item.중량_50cm),
    매입가격_50cm: numOrNull(item.매입가격_50cm),
    공임_50cm: numOrNull(item.공임_50cm),
    비고: str(item.비고),
  }
}

function chainsMergeRealtimeUpdate(
  prev: ChainRow,
  payloadNew: Record<string, unknown>,
): ChainRow {
  const n = payloadNew
  return {
    ...prev,
    체인명: n.체인명 !== undefined ? str(n.체인명) : prev.체인명,
    supplier_이름: n.supplier_이름 !== undefined ? str(n.supplier_이름) : prev.supplier_이름,
    품번: n.품번 !== undefined ? str(n.품번) : prev.품번,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    중량_50cm: n.중량_50cm !== undefined ? numOrNull(n.중량_50cm) : prev.중량_50cm,
    매입가격_50cm: n.매입가격_50cm !== undefined ? numOrNull(n.매입가격_50cm) : prev.매입가격_50cm,
    공임_50cm: n.공임_50cm !== undefined ? numOrNull(n.공임_50cm) : prev.공임_50cm,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const chainsPageConfig: PageConfig<ChainItem, ChainRow> = {
  pageKey: CHAINS_VIEW_PAGE_KEY,
  pageName: '체인',
  apiBase: '/api/chains',
  realtimeChannel: 'chains_changes',
  realtimeTable: 'flat_chains',
  selectOptionsTable: 'chains',
  columns: CHAINS_COLUMNS,
  colHeaders: CHAINS_COL_HEADERS,
  editableFields: CHAINS_EDITABLE_FIELDS,
  transformRow: transformChainRow,
  mergeRealtimeUpdate: chainsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
