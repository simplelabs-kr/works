// Rentals (대여) grid configuration — Case A (flat_rentals).
//
// search_flat_rentals / count_flat_rentals RPC 가 flat_rentals 단일 테이블에서
// 조회. 트리거가 rentals + 연관 테이블 변경을 동기화하며, realtime 은
// flat_rentals 로 구독한다.
//
// 링크 컬럼: order_item_고유번호 / 번들_고유번호 는 fieldType:'linklist'
// (maxLinks:1) chip UI. 정방향 N=1 모드 — 클릭 → 팝오버 → 현재 row 의
// FK (order_item_id / bundle_id) PATCH.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import { linkListRenderer, type LinkListConfig } from '@/features/works/linkListRenderer'
import type { RentalItem, RentalRow } from './rentalsTypes'

export const RENTALS_VIEW_PAGE_KEY = 'rentals'

// Row 필드명 → rentals 테이블 컬럼명. PATCH 대상.
// 링크 컬럼 FK (order_item_id / bundle_id) 는 COLUMNS 카탈로그에 없는
// orphan 편집 키 — route.ts 에서 overrides 로 spec 공급.
export const RENTALS_EDITABLE_FIELDS: Record<string, string> = {
  '반납': '반납',
  'order_item_id': 'order_item_id',
  'bundle_id': 'bundle_id',
}

// 링크 컬럼 설정 — order-items 검색 후 order_item_id 를 PATCH.
// display (`order_item_고유번호`) 는 flat_rentals 에 denormalized 저장.
const order_item_고유번호LinkListConfig: LinkListConfig = {
  linkTable: 'order-items',
  fkColumn: 'order_item_id',
  searchFields: ['고유_번호', '제품명'],
  displayField: '고유_번호',
  secondaryField: '제품명',
  maxLinks: 1,
}

// 링크 컬럼 설정 — bundles 검색 후 bundle_id 를 PATCH.
// display (`번들_고유번호`) 는 flat_rentals 에 denormalized 저장.
const 번들_고유번호LinkListConfig: LinkListConfig = {
  linkTable: 'bundles',
  fkColumn: 'bundle_id',
  searchFields: ['번들_고유번호', '명세서_고유번호'],
  displayField: '번들_고유번호',
  secondaryField: '브랜드명',
  maxLinks: 1,
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (생성일시 DESC) 은 RPC 측 ORDER BY 로 제공.
export const RENTALS_COLUMNS = [
  // ── 식별 ───────────────────────────────────────────────────
  { data: '고유번호',   title: '고유번호',   readOnly: true,  width: 120, fieldType: 'text' as FieldType },

  // ── 브랜드 / 제품 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true,  width: 140, fieldType: 'lookup' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'lookup' as FieldType },
  { data: '제품명',     title: '제품명',     readOnly: true,  width: 220, fieldType: 'lookup' as FieldType },

  // ── 링크 컬럼 (chip UI, 정방향 N=1) ─────────────────────────
  // `readOnly: true` + `editor: false` — 직접 타이핑 차단, 팝오버 경유만.
  { data: 'order_item_고유번호', title: 'order_item 고유번호', readOnly: true, width: 180, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: order_item_고유번호LinkListConfig },
  { data: '번들_고유번호',       title: '번들 고유번호',       readOnly: true, width: 180, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: 번들_고유번호LinkListConfig },

  // ── 편집 가능 ──────────────────────────────────────────────
  { data: '반납',         title: '반납',         readOnly: false, width: 70,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 메타 ───────────────────────────────────────────────────
  { data: '생성일시',     title: '생성일시',     readOnly: true, width: 150, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },

  // FK UUID (brand_id / order_item_id / bundle_id) 는 카탈로그 제외.

  // ── 타임스탬프 ─────────────────────────────────────────────
  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: 'updated_at', title: 'updated_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RENTALS_COL_HEADERS: string[] = (RENTALS_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ───────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function boolFlag(v: unknown): boolean {
  return v === true
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

// ── Item → Row 변환 ──────────────────────────────────────────────────

function transformRentalRow(item: RentalItem): RentalRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    제품명: str(item.제품명),
    order_item_고유번호: str(item.order_item_고유번호),
    번들_고유번호: str(item.번들_고유번호),

    반납: boolFlag(item.반납),
    생성일시: dateOrEmpty(item.생성일시),

    brand_id: item.brand_id ?? null,
    order_item_id: item.order_item_id ?? null,
    bundle_id: item.bundle_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// flat_rentals UPDATE 수신 시 denormalized 컬럼까지 모두 동기화.
// 트리거가 rentals / orders / bundles 변경을 flat 에 전파한다.
function rentalsMergeRealtimeUpdate(
  prev: RentalRow,
  payloadNew: Record<string, unknown>,
): RentalRow {
  const n = payloadNew
  return {
    ...prev,
    브랜드명: n.브랜드명 !== undefined ? str(n.브랜드명) : prev.브랜드명,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    order_item_고유번호: n.order_item_고유번호 !== undefined ? str(n.order_item_고유번호) : prev.order_item_고유번호,
    번들_고유번호: n.번들_고유번호 !== undefined ? str(n.번들_고유번호) : prev.번들_고유번호,
    반납: n.반납 !== undefined ? boolFlag(n.반납) : prev.반납,
    order_item_id: n.order_item_id !== undefined ? (n.order_item_id as string | null) : prev.order_item_id,
    bundle_id: n.bundle_id !== undefined ? (n.bundle_id as string | null) : prev.bundle_id,
    brand_id: n.brand_id !== undefined ? (n.brand_id as string | null) : prev.brand_id,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const rentalsPageConfig: PageConfig<RentalItem, RentalRow> = {
  pageKey: RENTALS_VIEW_PAGE_KEY,
  pageName: '대여',
  apiBase: '/api/rentals',
  realtimeChannel: 'rentals_changes',
  realtimeTable: 'flat_rentals',
  selectOptionsTable: 'rentals',
  columns: RENTALS_COLUMNS,
  colHeaders: RENTALS_COL_HEADERS,
  editableFields: RENTALS_EDITABLE_FIELDS,
  transformRow: transformRentalRow,
  mergeRealtimeUpdate: rentalsMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
