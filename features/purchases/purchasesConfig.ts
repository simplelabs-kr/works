// Purchases (매입) grid configuration — flat_purchases.
//
// search_flat_purchases / count_flat_purchases RPC 가 flat_purchases
// 단일 테이블에서 조회. realtime 은 flat_purchases.
//
// purchases ↔ order_items 는 다대다 — 중간 테이블 purchase_order_items.
// flat_purchases.order_item_목록 (JSONB chip array) 는 트리거가 sync.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import { linkListRenderer, type LinkListConfig } from '@/features/works/linkListRenderer'
import type { PurchaseItem, PurchaseRow, PurchaseChip } from './purchasesTypes'

export const PURCHASES_VIEW_PAGE_KEY = 'purchases'

// 편집 가능 컬럼. order_item_목록 은 junction PATCH 로 처리되므로 미등록.
export const PURCHASES_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '개당_수량': '개당_수량',
  '발주': '발주',
  '수령': '수령',
  '재고_사용': '재고_사용',
  '발주일': '발주일',
  '비고': '비고',
}

// 다대다 역방향 링크 — junction (purchase_order_items) 기반.
// add/remove 는 `/api/purchases/{id}` 에 `{junctionAdd|junctionRemove: {linkedId}}` PATCH.
const orderItemLinkConfig: LinkListConfig = {
  linkTable: 'order-items',
  fkColumn: 'purchase_id',                  // junction 의 현재 row 측 컬럼.
  junctionTable: 'purchase_order_items',
  junctionLinkedColumn: 'order_item_id',    // junction 의 상대 row 측 컬럼.
  cacheField: 'order_item_목록',
  searchFields: ['고유_번호', '제품명', '제품코드'],
  displayField: '제품명_코드',
}

export const PURCHASES_COLUMNS = [
  { data: '이름',     title: '이름',     readOnly: false, width: 200, fieldType: 'text' as FieldType },
  // flat_purchases.소재 는 첫 연결 order_item.소재 lookup 결과 (트리거 sync).
  { data: '소재',     title: '소재',     readOnly: true,  width: 100, fieldType: 'text' as FieldType },
  { data: '개당_수량', title: '개당 수량', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '발주',     title: '발주',     readOnly: false, width: 60,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '수령',     title: '수령',     readOnly: false, width: 60,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '재고_사용', title: '재고 사용', readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '발주일',   title: '발주일',   readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '비고',     title: '비고',     readOnly: false, width: 200, fieldType: 'text' as FieldType },

  // 다대다 링크 (chip UI, junction 기반).
  { data: 'order_item_목록', title: 'Link: Order Items', readOnly: true, width: 200, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: orderItemLinkConfig },

  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PURCHASES_COL_HEADERS: string[] = (PURCHASES_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function boolFlag(v: unknown): boolean {
  return v === true
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}
// JSONB 배열 → chip[]. displayField/secondaryField 매핑.
function chipArr(v: unknown, config: LinkListConfig): PurchaseChip[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any[] = []
  if (Array.isArray(v)) {
    raw = v
  } else if (typeof v === 'string' && v.trim().startsWith('[')) {
    try {
      const p = JSON.parse(v)
      if (Array.isArray(p)) raw = p
    } catch {
      /* ignore */
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((r: any) => {
    const display = r?.[config.displayField] ?? r?.display ?? ''
    const chip: PurchaseChip = {
      id: String(r?.id ?? ''),
      display: String(display),
    }
    if (config.secondaryField) {
      const sec = r?.[config.secondaryField] ?? r?.secondary
      if (sec != null && sec !== '') chip.secondary = String(sec)
    }
    return chip
  })
}

// ── Item → Row ──────────────────────────────────────────────────────

function transformPurchaseRow(item: PurchaseItem): PurchaseRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    이름: str(item.이름),
    소재: str(item.소재),
    개당_수량: numOrNull(item.개당_수량),
    발주: boolFlag(item.발주),
    수령: boolFlag(item.수령),
    재고_사용: boolFlag(item.재고_사용),
    발주일: dateOrEmpty(item.발주일),
    비고: str(item.비고),

    order_item_목록: chipArr(item.order_item_목록, orderItemLinkConfig),
  }
}

// ── Realtime UPDATE 머지 ────────────────────────────────────────────

function purchasesMergeRealtimeUpdate(
  prev: PurchaseRow,
  payloadNew: Record<string, unknown>,
): PurchaseRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    개당_수량: n.개당_수량 !== undefined ? numOrNull(n.개당_수량) : prev.개당_수량,
    발주: n.발주 !== undefined ? boolFlag(n.발주) : prev.발주,
    수령: n.수령 !== undefined ? boolFlag(n.수령) : prev.수령,
    재고_사용: n.재고_사용 !== undefined ? boolFlag(n.재고_사용) : prev.재고_사용,
    발주일: n.발주일 !== undefined ? dateOrEmpty(n.발주일) : prev.발주일,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    order_item_목록: n.order_item_목록 !== undefined ? chipArr(n.order_item_목록, orderItemLinkConfig) : prev.order_item_목록,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ──────────────────────────────────────────────────────

export const purchasesPageConfig: PageConfig<PurchaseItem, PurchaseRow> = {
  pageKey: PURCHASES_VIEW_PAGE_KEY,
  pageName: '매입',
  apiBase: '/api/purchases',
  realtimeChannel: 'purchases_changes',
  realtimeTable: 'flat_purchases',
  selectOptionsTable: 'purchases',
  columns: PURCHASES_COLUMNS,
  colHeaders: PURCHASES_COL_HEADERS,
  editableFields: PURCHASES_EDITABLE_FIELDS,
  transformRow: transformPurchaseRow,
  mergeRealtimeUpdate: purchasesMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
