// Bundles (번들) grid configuration — Case A (flat_bundles).
//
// search_flat_bundles / count_flat_bundles RPC 가 flat_bundles 단일 테이블
// 에서 조회. 트리거가 bundles + brands + order_items / repairs / rentals
// 역참조 변경을 flat 에 동기화 (JSONB 캐시 컬럼 포함).
//
// ⚠️ 25K 레코드 — `initialLoadPolicy: 'require-filter'` 로 필터 없이 열면
// 빈 그리드. 기간/브랜드 필터가 핵심.
//
// 역방향 linklist: order_item_목록 / repair_목록 / rental_목록 — chip UI
// (readOnly). add/remove 시 상대 테이블의 bundle_id 를 PATCH.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import { linkListRenderer, type LinkListConfig } from '@/features/works/linkListRenderer'
import type { BundleItem, BundleRow, BundleChip } from './bundlesTypes'

export const BUNDLES_VIEW_PAGE_KEY = 'bundles'

// Row 필드명 → bundles 테이블 컬럼명. PATCH 대상.
export const BUNDLES_EDITABLE_FIELDS: Record<string, string> = {
  '번들_고유번호': '번들_고유번호',
  '송장번호': '송장번호',
  '비고': '비고',
  '명세서_url': '명세서_url',
  '배송비': '배송비',
  '할인_공급가액': '할인_공급가액',
  '입금_금액': '입금_금액',
  '명세서_발행일': '명세서_발행일',
  '계산서_발행일': '계산서_발행일',
  '입금_확인': '입금_확인',
  '출고': '출고',
  '명세서_발송': '명세서_발송',
  '계산서_발행': '계산서_발행',
  '포장_확정': '포장_확정',
  '명세서_출력_완료': '명세서_출력_완료',
}

// 역방향 linklist 설정. cacheField 는 col.data 와 동일 (문서화 목적).
// fkColumn 은 상대 테이블의 bundle_id — add/remove 시 PATCH 대상.
const order_item_목록LinkListConfig: LinkListConfig = {
  linkTable: 'order-items',
  fkColumn: 'bundle_id',
  cacheField: 'order_item_목록',
  displayField: '표시명',
  searchFields: ['제품명', '제품코드', '고유_번호'],
}

const repair_목록LinkListConfig: LinkListConfig = {
  linkTable: 'repairs',
  fkColumn: 'bundle_id',
  cacheField: 'repair_목록',
  displayField: '표시명',
  searchFields: ['고유번호'],
}

const rental_목록LinkListConfig: LinkListConfig = {
  linkTable: 'rentals',
  fkColumn: 'bundle_id',
  cacheField: 'rental_목록',
  displayField: '표시명',
  searchFields: ['고유번호'],
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (created_at DESC) 은 RPC 측 ORDER BY 로 제공.
export const BUNDLES_COLUMNS = [
  // ── 식별 ───────────────────────────────────────────────────
  { data: '번들_고유번호',   title: '번들 고유번호',   readOnly: false, width: 140, fieldType: 'text' as FieldType },

  // ── 브랜드 (JOIN 유래, readOnly) ───────────────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'lookup' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'lookup' as FieldType },

  // ── 역방향 linklist (chip UI, readOnly) ────────────────────
  // flat_bundles 의 JSONB 캐시 컬럼. 트리거가 order_items / repairs / rentals
  // 의 bundle_id 변경 시 자동 재계산. add/remove 는 상대 row 의 bundle_id 를 PATCH.
  { data: 'order_item_목록', title: '주문 제품 목록', readOnly: true, width: 300, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: order_item_목록LinkListConfig },
  { data: 'repair_목록',     title: '수선 목록',       readOnly: true, width: 200, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: repair_목록LinkListConfig },
  { data: 'rental_목록',     title: '대여 목록',       readOnly: true, width: 200, fieldType: 'linklist' as FieldType, editor: false, renderer: linkListRenderer, linkListConfig: rental_목록LinkListConfig },

  // ── 편집 가능 — text ──────────────────────────────────────
  { data: '송장번호',   title: '송장번호',   readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '비고',       title: '비고',       readOnly: false, width: 200, fieldType: 'text' as FieldType },
  { data: '명세서_url', title: '명세서 URL', readOnly: false, width: 240, fieldType: 'text' as FieldType },

  // ── 편집 가능 — numeric ───────────────────────────────────
  { data: '배송비',        title: '배송비',         readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '할인_공급가액', title: '할인(공급가액)', readOnly: false, width: 120, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '입금_금액',     title: '입금 금액',      readOnly: false, width: 120, fieldType: 'number' as FieldType, type: 'numeric' },

  // ── 편집 가능 — date ──────────────────────────────────────
  { data: '명세서_발행일', title: '명세서 발행일', readOnly: false, width: 120, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '계산서_발행일', title: '계산서 발행일', readOnly: false, width: 120, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },

  // ── 편집 가능 — checkbox ──────────────────────────────────
  { data: '입금_확인',        title: '입금 확인',        readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '출고',             title: '출고',             readOnly: false, width: 70,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '명세서_발송',      title: '명세서 발송',      readOnly: false, width: 100, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '계산서_발행',      title: '계산서 발행',      readOnly: false, width: 100, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '포장_확정',        title: '포장 확정',        readOnly: false, width: 90,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '명세서_출력_완료', title: '명세서 출력 완료', readOnly: false, width: 120, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 메타 (readOnly) ───────────────────────────────────────
  { data: '생성자',         title: '생성자',         readOnly: true, width: 120, fieldType: 'text' as FieldType },
  { data: '입금_확인_일시', title: '입금 확인 일시', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: '출고_체크_일시', title: '출고 체크 일시', readOnly: true, width: 160, fieldType: 'date' as FieldType },

  // FK UUID (brand_id) 는 카탈로그 제외.

  // ── 타임스탬프 ─────────────────────────────────────────────
  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: 'updated_at', title: 'updated_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUNDLES_COL_HEADERS: string[] = (BUNDLES_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ───────────────────────────────────────────────────────────────

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
// JSONB 배열을 chip 객체로 정규화.
// DB 저장 형태: [{ id, <displayField>, <secondaryField?>, ... }]
// renderer 기대 형태: [{ id, display, secondary? }]
// linklist 설정의 displayField / secondaryField 로 매핑한다.
function chipArr(v: unknown, config: LinkListConfig): BundleChip[] {
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
    const chip: BundleChip = {
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

// ── Item → Row 변환 ──────────────────────────────────────────────────

function transformBundleRow(item: BundleItem): BundleRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    번들_고유번호: str(item.번들_고유번호),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),

    배송비: numOrNull(item.배송비),
    할인_공급가액: numOrNull(item.할인_공급가액),
    입금_금액: numOrNull(item.입금_금액),

    명세서_발행일: dateOrEmpty(item.명세서_발행일),
    계산서_발행일: dateOrEmpty(item.계산서_발행일),

    입금_확인: boolFlag(item.입금_확인),
    출고: boolFlag(item.출고),
    명세서_발송: boolFlag(item.명세서_발송),
    계산서_발행: boolFlag(item.계산서_발행),
    포장_확정: boolFlag(item.포장_확정),
    명세서_출력_완료: boolFlag(item.명세서_출력_완료),

    송장번호: str(item.송장번호),
    비고: str(item.비고),
    명세서_url: str(item.명세서_url),
    생성자: str(item.생성자),

    입금_확인_일시: item.입금_확인_일시 ?? null,
    출고_체크_일시: item.출고_체크_일시 ?? null,

    order_item_목록: chipArr(item.order_item_목록, order_item_목록LinkListConfig),
    repair_목록: chipArr(item.repair_목록, repair_목록LinkListConfig),
    rental_목록: chipArr(item.rental_목록, rental_목록LinkListConfig),

    brand_id: item.brand_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// flat_bundles UPDATE 수신 시 모든 컬럼 (brands JOIN + JSONB 캐시 포함) 을
// 실시간 동기화. 트리거가 order_items/repairs/rentals 의 bundle_id 변경 시
// 대상 bundle 에 sync_flat_bundle() 을 호출하므로 캐시도 전파된다.
function bundlesMergeRealtimeUpdate(
  prev: BundleRow,
  payloadNew: Record<string, unknown>,
): BundleRow {
  const n = payloadNew
  return {
    ...prev,
    번들_고유번호: n.번들_고유번호 !== undefined ? str(n.번들_고유번호) : prev.번들_고유번호,
    브랜드명: n.브랜드명 !== undefined ? str(n.브랜드명) : prev.브랜드명,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    송장번호: n.송장번호 !== undefined ? str(n.송장번호) : prev.송장번호,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    명세서_url: n.명세서_url !== undefined ? str(n.명세서_url) : prev.명세서_url,
    배송비: n.배송비 !== undefined ? numOrNull(n.배송비) : prev.배송비,
    할인_공급가액: n.할인_공급가액 !== undefined ? numOrNull(n.할인_공급가액) : prev.할인_공급가액,
    입금_금액: n.입금_금액 !== undefined ? numOrNull(n.입금_금액) : prev.입금_금액,
    명세서_발행일: n.명세서_발행일 !== undefined ? dateOrEmpty(n.명세서_발행일) : prev.명세서_발행일,
    계산서_발행일: n.계산서_발행일 !== undefined ? dateOrEmpty(n.계산서_발행일) : prev.계산서_발행일,
    입금_확인: n.입금_확인 !== undefined ? boolFlag(n.입금_확인) : prev.입금_확인,
    출고: n.출고 !== undefined ? boolFlag(n.출고) : prev.출고,
    명세서_발송: n.명세서_발송 !== undefined ? boolFlag(n.명세서_발송) : prev.명세서_발송,
    계산서_발행: n.계산서_발행 !== undefined ? boolFlag(n.계산서_발행) : prev.계산서_발행,
    포장_확정: n.포장_확정 !== undefined ? boolFlag(n.포장_확정) : prev.포장_확정,
    명세서_출력_완료: n.명세서_출력_완료 !== undefined ? boolFlag(n.명세서_출력_완료) : prev.명세서_출력_완료,
    입금_확인_일시: n.입금_확인_일시 !== undefined ? (n.입금_확인_일시 as string | null) : prev.입금_확인_일시,
    출고_체크_일시: n.출고_체크_일시 !== undefined ? (n.출고_체크_일시 as string | null) : prev.출고_체크_일시,
    order_item_목록: n.order_item_목록 !== undefined ? chipArr(n.order_item_목록, order_item_목록LinkListConfig) : prev.order_item_목록,
    repair_목록: n.repair_목록 !== undefined ? chipArr(n.repair_목록, repair_목록LinkListConfig) : prev.repair_목록,
    rental_목록: n.rental_목록 !== undefined ? chipArr(n.rental_목록, rental_목록LinkListConfig) : prev.rental_목록,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const bundlesPageConfig: PageConfig<BundleItem, BundleRow> = {
  pageKey: BUNDLES_VIEW_PAGE_KEY,
  pageName: '번들',
  apiBase: '/api/bundles',
  realtimeChannel: 'bundles_changes',
  realtimeTable: 'flat_bundles',
  selectOptionsTable: 'bundles',
  columns: BUNDLES_COLUMNS,
  colHeaders: BUNDLES_COL_HEADERS,
  editableFields: BUNDLES_EDITABLE_FIELDS,
  transformRow: transformBundleRow,
  mergeRealtimeUpdate: bundlesMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  initialLoadPolicy: 'require-filter',
}
