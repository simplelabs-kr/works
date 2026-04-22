// Refunds (환불) grid configuration — Case B (직접 JOIN).
//
// search_refunds / count_refunds RPC 가 refunds + 연관 테이블을 직접 JOIN.
// flat table 없음 — realtime 전파도 없다. DataGrid 가 realtimeTable 을
// 요구하지만 source 테이블이 publication 에 없는 한 이벤트는 오지 않는다.
//
// 스키마에서 제거된 컬럼: 이름 / 공급가액 / 수량 / 반품_금액_합계 /
// 반품_소재비 / 반품_공임 / 반영일 / 고객명(원본 lookup) / 순금_중량.
// formula/lookup 이라 Airtable 원본이 아니며 RPC JOIN 으로 조회된다.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { linkRenderer, type LinkConfig } from '@/features/works/linkRenderer'
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
// display (`order_item_표시명`) 는 search_refunds RPC 가
// `flat_order_details.제품명_코드 AS order_item_표시명` 으로 노출
// (제품명[고유_번호 tail] — order-items 페이지의 '제품명[코드]' 와 동일).
// 팝오버는 /api/order-items 로 검색하며 displayField 는 해당 페이지의
// `제품명_코드` 컬럼 (flat_order_details 에 DB-computed) 을 그대로 사용.
const order_item_표시명LinkConfig: LinkConfig = {
  linkTable: 'order-items',
  fkColumn: 'order_item_id',
  searchFields: ['제품명', '제품코드', '고유_번호'],
  displayField: '제품명_코드',
  secondaryField: '고유_번호',
}

// 링크 컬럼 설정 — bundles 검색 후 bundle_id 를 PATCH.
// display (`번들_고유번호`) 는 search_refunds RPC 가
// `bundles.번들_고유번호 AS 번들_고유번호` 로 노출.
const 번들_고유번호LinkConfig: LinkConfig = {
  linkTable: 'bundles',
  fkColumn: 'bundle_id',
  searchFields: ['번들_고유번호'],
  displayField: '번들_고유번호',
  secondaryField: '브랜드명',
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (생성일시 DESC) 은 RPC 측 기본 정렬로 제공.
export const REFUNDS_COLUMNS = [
  // ── 구분 ───────────────────────────────────────────────────
  { data: '반품_구분',  title: '반품 구분',  readOnly: false, width: 120, fieldType: 'select' as FieldType, renderer: 반품구분Renderer },

  // ── 브랜드 / 고객 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },
  { data: '고객명',     title: '고객명',     readOnly: true, width: 120, fieldType: 'text' as FieldType },

  // ── 링크 컬럼 (클릭 시 검색 팝오버 → FK PATCH) ──────────────
  // `readOnly: true` 는 inline 텍스트 편집 방지 — 실제 편집은 popover 에서.
  { data: 'order_item_표시명', title: '주문 제품[코드]', readOnly: true, width: 260, fieldType: 'link' as FieldType, renderer: linkRenderer, linkConfig: order_item_표시명LinkConfig },
  { data: '번들_고유번호',     title: '번들 고유번호',   readOnly: true, width: 160, fieldType: 'link' as FieldType, renderer: linkRenderer, linkConfig: 번들_고유번호LinkConfig },

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
// Case B — source 테이블이 publication 에 없으면 이벤트는 오지 않는다.
// 편집 가능 필드만 동기화.
function refundsMergeRealtimeUpdate(
  prev: RefundRow,
  payloadNew: Record<string, unknown>,
): RefundRow {
  const n = payloadNew
  return {
    ...prev,
    반품_구분: n.반품_구분 !== undefined ? str(n.반품_구분) : prev.반품_구분,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const refundsPageConfig: PageConfig<RefundItem, RefundRow> = {
  pageKey: REFUNDS_VIEW_PAGE_KEY,
  pageName: '환불',
  apiBase: '/api/refunds',
  // flat table 없음 — source 테이블이 publication 에 없으면 realtime 이벤트는 오지 않음.
  realtimeChannel: 'refunds_changes',
  realtimeTable: 'refunds',
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
