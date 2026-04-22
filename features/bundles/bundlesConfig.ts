// Bundles (번들) grid configuration — Case B (직접 JOIN).
//
// search_bundles / count_bundles RPC 가 bundles + brands 를 직접 JOIN.
// flat table 없음 — realtime 전파도 없다. DataGrid 가 realtimeTable 을
// 요구하지만 source 테이블이 publication 에 없는 한 이벤트는 오지 않는다.
//
// ⚠️ 25K 레코드 — `initialLoadPolicy: 'require-filter'` 로 필터 없이 열면
// 빈 그리드. 기간/브랜드 필터가 핵심.
//
// 스키마에서 제거된 컬럼 (formula): 구분 / 정산_상태 / 정산_기한 /
// 생성일(STR → created_at) / 출고_체크_일시(STR). Airtable 원본이 아니며
// RPC 계산 또는 DB 트리거로 관리한다.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { BundleItem, BundleRow } from './bundlesTypes'

export const BUNDLES_VIEW_PAGE_KEY = 'bundles'

// Row 필드명 → bundles 테이블 컬럼명. PATCH 대상.
export const BUNDLES_EDITABLE_FIELDS: Record<string, string> = {
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

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (created_at DESC) 은 RPC 측 ORDER BY 로 제공.
export const BUNDLES_COLUMNS = [
  // ── 식별 ───────────────────────────────────────────────────
  { data: '번들_고유번호',   title: '번들 고유번호',   readOnly: true, width: 140, fieldType: 'text' as FieldType },
  { data: '명세서_고유번호', title: '명세서 고유번호', readOnly: true, width: 140, fieldType: 'text' as FieldType },

  // ── 브랜드 (JOIN 유래, readOnly) ───────────────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },

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

// ── Item → Row 변환 ──────────────────────────────────────────────────

function transformBundleRow(item: BundleItem): BundleRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    번들_고유번호: str(item.번들_고유번호),
    명세서_고유번호: str(item.명세서_고유번호),

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

    brand_id: item.brand_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// Case B — source 테이블이 publication 에 없으면 이벤트는 오지 않는다.
// 편집 가능 필드 + 트리거가 갱신하는 타임스탬프만 동기화.
function bundlesMergeRealtimeUpdate(
  prev: BundleRow,
  payloadNew: Record<string, unknown>,
): BundleRow {
  const n = payloadNew
  return {
    ...prev,
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
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const bundlesPageConfig: PageConfig<BundleItem, BundleRow> = {
  pageKey: BUNDLES_VIEW_PAGE_KEY,
  pageName: '번들',
  apiBase: '/api/bundles',
  // flat table 없음 — source 테이블이 publication 에 없으면 realtime 이벤트는 오지 않음.
  realtimeChannel: 'bundles_changes',
  realtimeTable: 'bundles',
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
