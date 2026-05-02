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
import { 소재LookupRenderer, formatCreatedAt } from './purchasesRenderers'
import type { PurchaseItem, PurchaseRow, PurchaseChip } from './purchasesTypes'

export const PURCHASES_VIEW_PAGE_KEY = 'purchases'

// 편집 가능 컬럼. order_item_목록 은 junction PATCH 로 처리되므로 미등록.
// 이름 은 formula (자동 계산) 이므로 편집 불가. 개당_수량 은 발주 시점
// product_materials.개수 스냅샷 — 이후 편집 가능.
export const PURCHASES_EDITABLE_FIELDS: Record<string, string> = {
  '개당_수량': '개당_수량',
  '발주': '발주',
  '수령': '수령',
  '재고_사용': '재고_사용',
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
  // materials.품목명 + 필요_원부자재_수량 으로 구성된 표시 이름 — DB 트리거가 sync.
  { data: '이름',     title: '이름',     readOnly: true,  width: 200, fieldType: 'formula' as FieldType, outputType: 'text' as FieldType },
  // 첫 연결 order_item.소재 트리거 sync. 컬러 뱃지는 order_items 의
  // field_options(table_name='order_items', field_name='소재') 카탈로그를
  // page-level 로 추가 hydrate (extraSelectOptionsTables) 해서 동일하게 적용.
  { data: '소재',     title: '소재',     readOnly: true,  width: 100, fieldType: 'lookup' as FieldType,
    sourceTable: 'order_items', sourceField: '소재', editor: false, renderer: 소재LookupRenderer },
  // 매입처: materials.type 별 supplier 경로 (stones/chains/other_materials → suppliers.이름).
  // DB 트리거가 sync.
  { data: '매입처',   title: '매입처',   readOnly: true,  width: 120, fieldType: 'lookup' as FieldType },
  // 발주 시점 product_materials.개수 스냅샷 — 이후 편집 가능.
  { data: '개당_수량', title: '개당 수량', readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  // 첫 연결 order_item.발주_수량 (트리거 sync) — junction 으로부터 값을
  // 가져오는 lookup. 계산이 아니라 참조이므로 fieldType:'lookup'.
  { data: '제품_발주_수량',   title: '제품 발주 수량',   readOnly: true, width: 110, fieldType: 'lookup' as FieldType, outputType: 'number' as FieldType, type: 'numeric' },
  // 제품_발주_수량 × 개당_수량 — DB 계산값 (flat 에 물리 컬럼으로 저장).
  { data: '필요_원부자재_수량', title: '필요 원부자재 수량', readOnly: true, width: 130, fieldType: 'formula' as FieldType, outputType: 'number' as FieldType, type: 'numeric' },
  { data: '발주',     title: '발주',     readOnly: false, width: 60,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '수령',     title: '수령',     readOnly: false, width: 60,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '재고_사용', title: '재고 사용', readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '비고',     title: '비고',     readOnly: false, width: 200, fieldType: 'text' as FieldType },

  // 다대다 링크 (chip UI, junction 기반).
  { data: 'order_item_목록', title: 'Link: Order Items', readOnly: true, width: 200, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: orderItemLinkConfig },

  // 생성일시: ISO 타임스탬프를 'YYYY-MM-DD HH:mm' 로 transform 단계에서 포맷.
  { data: 'created_at', title: '생성일시', readOnly: true, width: 140, fieldType: 'date' as FieldType, system: true },
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
    // 'YYYY-MM-DD HH:mm' 로 미리 포맷 — HOT 의 default text renderer 가 그대로
    // 표시하고, lexicographic 비교로 sort/filter 모두 동작한다.
    created_at: formatCreatedAt(item.created_at),

    이름: str(item.이름),
    소재: str(item.소재),
    매입처: str(item.매입처),
    개당_수량: numOrNull(item.개당_수량),
    제품_발주_수량: numOrNull(item.제품_발주_수량),
    필요_원부자재_수량: numOrNull(item.필요_원부자재_수량),
    발주: boolFlag(item.발주),
    수령: boolFlag(item.수령),
    재고_사용: boolFlag(item.재고_사용),
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
    매입처: n.매입처 !== undefined ? str(n.매입처) : prev.매입처,
    개당_수량: n.개당_수량 !== undefined ? numOrNull(n.개당_수량) : prev.개당_수량,
    제품_발주_수량: n.제품_발주_수량 !== undefined ? numOrNull(n.제품_발주_수량) : prev.제품_발주_수량,
    필요_원부자재_수량: n.필요_원부자재_수량 !== undefined ? numOrNull(n.필요_원부자재_수량) : prev.필요_원부자재_수량,
    발주: n.발주 !== undefined ? boolFlag(n.발주) : prev.발주,
    수령: n.수령 !== undefined ? boolFlag(n.수령) : prev.수령,
    재고_사용: n.재고_사용 !== undefined ? boolFlag(n.재고_사용) : prev.재고_사용,
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
  // 소재 lookup 컬럼이 order_items 의 select 옵션을 빌려 쓴다.
  extraSelectOptionsTables: ['order_items'],
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
