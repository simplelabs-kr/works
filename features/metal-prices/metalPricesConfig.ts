// Metal Prices (시세) grid configuration — flat_metal_prices.
//
// search_flat_metal_prices / count_flat_metal_prices RPC 가
// flat_metal_prices 단일 테이블에서 조회. realtime 은 flat_metal_prices.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { MetalPriceItem, MetalPriceRow } from './metalPricesTypes'

export const METAL_PRICES_VIEW_PAGE_KEY = 'metal-prices'

export const METAL_PRICES_EDITABLE_FIELDS: Record<string, string> = {
  'date': 'date',
  'metal': 'metal',
  'price_per_gram': 'price_per_gram',
}

export const METAL_PRICES_COLUMNS = [
  { data: 'date',  title: '일자', readOnly: false, width: 120, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: 'metal', title: '금속', readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: 'price_per_gram', title: 'g당 시세', readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },

  // 우측 끝 컬럼 width 조절을 위한 phantom spacer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { data: '_spacer', title: '', readOnly: true, width: 60, fieldType: 'text' as FieldType, derived: true, renderer: ((_h: any, td: any) => { td.innerHTML = ''; td.style.background = '#F8F9FA' }) as any },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const METAL_PRICES_COL_HEADERS: string[] = (METAL_PRICES_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ────────────────────────────────────────────────────────────

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

// ── Item → Row ──────────────────────────────────────────────────────

function transformMetalPriceRow(item: MetalPriceItem): MetalPriceRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    date: dateOrEmpty(item.date),
    metal: str(item.metal),
    price_per_gram: numOrNull(item.price_per_gram),
  }
}

// ── Realtime UPDATE 머지 ────────────────────────────────────────────

function metalPricesMergeRealtimeUpdate(
  prev: MetalPriceRow,
  payloadNew: Record<string, unknown>,
): MetalPriceRow {
  const n = payloadNew
  return {
    ...prev,
    date: n.date !== undefined ? dateOrEmpty(n.date) : prev.date,
    metal: n.metal !== undefined ? str(n.metal) : prev.metal,
    price_per_gram: n.price_per_gram !== undefined ? numOrNull(n.price_per_gram) : prev.price_per_gram,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ──────────────────────────────────────────────────────

export const metalPricesPageConfig: PageConfig<MetalPriceItem, MetalPriceRow> = {
  pageKey: METAL_PRICES_VIEW_PAGE_KEY,
  pageName: '시세',
  apiBase: '/api/metal-prices',
  realtimeChannel: 'metal_prices_changes',
  realtimeTable: 'flat_metal_prices',
  selectOptionsTable: 'metal_prices',
  columns: METAL_PRICES_COLUMNS,
  colHeaders: METAL_PRICES_COL_HEADERS,
  editableFields: METAL_PRICES_EDITABLE_FIELDS,
  transformRow: transformMetalPriceRow,
  mergeRealtimeUpdate: metalPricesMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
