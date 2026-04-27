// Refunds (환불) grid configuration — Case A (flat_refunds).
//
// search_flat_refunds / count_flat_refunds RPC 가 flat_refunds 단일 테이블
// 에서 조회. 트리거가 refunds + 연관 테이블 변경을 동기화하며, realtime
// 은 flat_refunds 로 구독한다.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { linkListRenderer, type LinkListConfig } from '@/features/works/linkListRenderer'
import { 반품구분Renderer } from './refundsRenderers'
import type { RefundItem, RefundRow } from './refundsTypes'

export const REFUNDS_VIEW_PAGE_KEY = 'refunds'

// Row 필드명 → refunds 테이블 컬럼명. PATCH 대상.
// 링크 컬럼 FK (order_item_id / bundle_id) 는 COLUMNS 카탈로그에 없는
// orphan 편집 키 — route.ts 에서 overrides 로 spec 공급.
export const REFUNDS_EDITABLE_FIELDS: Record<string, string> = {
  '반품_구분': '반품_구분',
  'order_item_id': 'order_item_id',
  'bundle_id': 'bundle_id',
}

// 링크 컬럼 설정 — order-items 검색 후 order_item_id 를 PATCH.
// display (`order_item_표시명`) 는 flat_refunds 에 denormalized 저장
// (제품명[고유_번호 tail] — order-items 페이지의 '제품명[코드]' 와 동일).
const order_item_표시명LinkListConfig: LinkListConfig = {
  linkTable: 'order-items',
  fkColumn: 'order_item_id',
  searchFields: ['제품명', '제품코드', '고유_번호'],
  displayField: '제품명_코드',
  secondaryField: '고유_번호',
  maxLinks: 1,
}

// 링크 컬럼 설정 — bundles 검색 후 bundle_id 를 PATCH.
// display (`번들_고유번호`) 는 flat_refunds 에 denormalized 저장.
const 번들_고유번호LinkListConfig: LinkListConfig = {
  linkTable: 'bundles',
  fkColumn: 'bundle_id',
  searchFields: ['번들_고유번호'],
  displayField: '번들_고유번호',
  secondaryField: '브랜드명',
  maxLinks: 1,
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (생성일시 DESC) 은 RPC 측 기본 정렬로 제공.
export const REFUNDS_COLUMNS = [
  // ── 구분 ───────────────────────────────────────────────────
  { data: '반품_구분',  title: '반품 구분',  readOnly: false, width: 120, fieldType: 'select' as FieldType, renderer: 반품구분Renderer },

  // ── 브랜드 / 고객 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'lookup' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'lookup' as FieldType },
  { data: '고객명',     title: '고객명',     readOnly: true, width: 120, fieldType: 'lookup' as FieldType },

  // ── 링크 컬럼 (chip UI, 정방향 N=1) ─────────────────────────
  // `readOnly: true` + `editor: false` — 직접 타이핑 차단, 팝오버 경유만.
  { data: 'order_item_표시명', title: '주문 제품[코드]', readOnly: true, width: 280, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: order_item_표시명LinkListConfig },
  { data: '번들_고유번호',     title: '번들 고유번호',   readOnly: true, width: 180, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: 번들_고유번호LinkListConfig },

  // ── 메타 ───────────────────────────────────────────────────
  { data: '생성일시',   title: '생성일시',   readOnly: true, width: 150, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },

  // FK UUID (order_item_id / bundle_id / rental_id) 는 카탈로그 제외.

  // ── 타임스탬프 ─────────────────────────────────────────────
  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: 'updated_at', title: 'updated_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REFUNDS_COL_HEADERS: string[] = (REFUNDS_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ───────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

// ── Item → Row 변환 ──────────────────────────────────────────────────

function transformRefundRow(item: RefundItem): RefundRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    반품_구분: str(item.반품_구분),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    고객명: str(item.고객명),
    order_item_표시명: str(item.order_item_표시명),
    번들_고유번호: str(item.번들_고유번호),

    생성일시: dateOrEmpty(item.생성일시),

    order_item_id: item.order_item_id ?? null,
    bundle_id: item.bundle_id ?? null,
    rental_id: item.rental_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// flat_refunds UPDATE 수신 시 denormalized 컬럼까지 모두 동기화.
// 트리거가 refunds / bundles / order_items 변경을 flat 에 전파.
function refundsMergeRealtimeUpdate(
  prev: RefundRow,
  payloadNew: Record<string, unknown>,
): RefundRow {
  const n = payloadNew
  return {
    ...prev,
    반품_구분: n.반품_구분 !== undefined ? str(n.반품_구분) : prev.반품_구분,
    브랜드명: n.브랜드명 !== undefined ? str(n.브랜드명) : prev.브랜드명,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    고객명: n.고객명 !== undefined ? str(n.고객명) : prev.고객명,
    order_item_표시명: n.order_item_표시명 !== undefined ? str(n.order_item_표시명) : prev.order_item_표시명,
    번들_고유번호: n.번들_고유번호 !== undefined ? str(n.번들_고유번호) : prev.번들_고유번호,
    order_item_id: n.order_item_id !== undefined ? (n.order_item_id as string | null) : prev.order_item_id,
    bundle_id: n.bundle_id !== undefined ? (n.bundle_id as string | null) : prev.bundle_id,
    rental_id: n.rental_id !== undefined ? (n.rental_id as string | null) : prev.rental_id,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const refundsPageConfig: PageConfig<RefundItem, RefundRow> = {
  pageKey: REFUNDS_VIEW_PAGE_KEY,
  pageName: '환불',
  apiBase: '/api/refunds',
  realtimeChannel: 'refunds_changes',
  realtimeTable: 'flat_refunds',
  selectOptionsTable: 'refunds',
  columns: REFUNDS_COLUMNS,
  colHeaders: REFUNDS_COL_HEADERS,
  editableFields: REFUNDS_EDITABLE_FIELDS,
  transformRow: transformRefundRow,
  mergeRealtimeUpdate: refundsMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
