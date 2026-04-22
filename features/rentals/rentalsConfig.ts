// Rentals (대여) grid configuration — Case B (직접 JOIN).
//
// search_rentals / count_rentals RPC 가 rentals + 연관 테이블을 직접 JOIN.
// flat table 없음 — realtime 전파도 없다. DataGrid 가 realtimeTable 을
// 요구하지만 source 테이블이 publication 에 없는 한 이벤트는 오지 않는다.
//
// 스키마에서 제거된 컬럼: 이름 / 현황 / 수량 / 공급가액 / 공임 / 소재비 /
// 기준_소재비 / 중량 / 순금_중량 / 생산시작일 / 디자이너_노트 / 반품_번들명.
// formula/lookup 이라 Airtable 원본이 아니며 RPC JOIN 으로 계산/조회된다.
// 고유번호: DB 트리거가 INSERT 시 자동 생성 → readOnly.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import { linkRenderer, type LinkConfig } from '@/features/works/linkRenderer'
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
// display (`order_item_고유번호`) 는 search_rentals RPC 가
// `order_items.고유_번호 AS order_item_고유번호` 로 노출.
const order_item_고유번호LinkConfig: LinkConfig = {
  linkTable: 'order-items',
  fkColumn: 'order_item_id',
  searchFields: ['고유_번호', '제품명'],
  displayField: '고유_번호',
  secondaryField: '제품명',
}

// 링크 컬럼 설정 — bundles 검색 후 bundle_id 를 PATCH.
// display (`번들_고유번호`) 는 search_rentals RPC 가
// `bundles.번들_고유번호 AS 번들_고유번호` 로 노출.
const 번들_고유번호LinkConfig: LinkConfig = {
  linkTable: 'bundles',
  fkColumn: 'bundle_id',
  searchFields: ['번들_고유번호', '명세서_고유번호'],
  displayField: '번들_고유번호',
  secondaryField: '브랜드명',
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (생성일시 DESC) 은 RPC 측 ORDER BY 로 제공.
export const RENTALS_COLUMNS = [
  // ── 식별 ───────────────────────────────────────────────────
  { data: '고유번호',   title: '고유번호',   readOnly: true,  width: 120, fieldType: 'text' as FieldType },

  // ── 브랜드 / 제품 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true,  width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },
  { data: '제품명',     title: '제품명',     readOnly: true,  width: 220, fieldType: 'text' as FieldType },

  // ── 링크 컬럼 (클릭 시 검색 팝오버 → FK PATCH) ──────────────
  // `readOnly: true` 는 inline 텍스트 편집 방지 — 실제 편집은 popover 에서.
  { data: 'order_item_고유번호', title: 'order_item 고유번호', readOnly: true, width: 160, fieldType: 'link' as FieldType, renderer: linkRenderer, linkConfig: order_item_고유번호LinkConfig },
  { data: '번들_고유번호',       title: '번들 고유번호',       readOnly: true, width: 160, fieldType: 'link' as FieldType, renderer: linkRenderer, linkConfig: 번들_고유번호LinkConfig },

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
// Case B — source 테이블이 publication 에 없으면 이벤트는 오지 않는다.
// 편집 가능 필드만 동기화.
function rentalsMergeRealtimeUpdate(
  prev: RentalRow,
  payloadNew: Record<string, unknown>,
): RentalRow {
  const n = payloadNew
  return {
    ...prev,
    반납: n.반납 !== undefined ? boolFlag(n.반납) : prev.반납,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const rentalsPageConfig: PageConfig<RentalItem, RentalRow> = {
  pageKey: RENTALS_VIEW_PAGE_KEY,
  pageName: '대여',
  apiBase: '/api/rentals',
  realtimeChannel: 'rentals_changes',
  realtimeTable: 'rentals',
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
