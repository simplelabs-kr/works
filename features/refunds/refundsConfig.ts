// Refunds (환불) grid configuration — Case B (직접 JOIN).
//
// search_refunds / count_refunds RPC 가 refunds + 연관 테이블을 직접
// JOIN 해서 shape 를 만들어 준다. flat table 없음.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { 반품구분Renderer } from './refundsRenderers'
import type { RefundItem, RefundRow } from './refundsTypes'

export const REFUNDS_VIEW_PAGE_KEY = 'refunds'

// Row 필드명 → refunds 테이블 컬럼명. PATCH 대상.
export const REFUNDS_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '반품_구분': '반품_구분',
  '수량': '수량',
  '공급가액': '공급가액',
  '반품_소재비': '반품_소재비',
  '반품_공임': '반품_공임',
  '반품_금액_합계': '반품_금액_합계',
  '순금_중량': '순금_중량',
  '반영일': '반영일',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const datePickerConfig: any = {
  i18n: {
    previousMonth: '이전 달',
    nextMonth: '다음 달',
    months: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
    weekdays: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
    weekdaysShort: ['일','월','화','수','목','금','토'],
  },
  firstDay: 0,
  showDaysInNextAndPreviousMonths: true,
  toString(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDraw(picker: any) {
    const title = picker.el?.querySelector('.pika-title')
    if (!title) return
    const labels = title.querySelectorAll('.pika-label')
    if (labels.length < 2) return
    const monthLabel = labels[0]
    const yearLabel = labels[1]
    if (yearLabel && monthLabel && monthLabel.previousElementSibling !== yearLabel) {
      title.insertBefore(yearLabel, monthLabel)
    }
  },
}

// 컬럼 카탈로그.
// ⚠️ 기본 정렬 (생성일시 DESC) 은 RPC 측 기본 정렬로 제공.
export const REFUNDS_COLUMNS = [
  // ── 식별 / 구분 ─────────────────────────────────────────────
  { data: '이름',       title: '이름',       readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '반품_구분',  title: '반품 구분',  readOnly: false, width: 120, fieldType: 'select' as FieldType, renderer: 반품구분Renderer },

  // ── 브랜드 / 고객 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },
  { data: '고객명',     title: '고객명',     readOnly: true, width: 120, fieldType: 'text' as FieldType },

  // ── 수량 / 금액 ────────────────────────────────────────────
  { data: '수량',            title: '수량',            readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '공급가액',        title: '공급가액',        readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '반품_소재비',     title: '반품 소재비',     readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '반품_공임',       title: '반품 공임',       readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '반품_금액_합계',  title: '반품 금액 합계',  readOnly: false, width: 130, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '순금_중량',       title: '순금 중량',       readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0.[00]' } },

  // ── 날짜 ───────────────────────────────────────────────────
  { data: '반영일',     title: '반영일',     readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },
  { data: '생성일시',   title: '생성일시',   readOnly: true,  width: 150, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },

  // FK UUID (order_item_id / bundle_id / rental_id) 는 의도적으로 카탈로그에서 제외.

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
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
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

    이름: str(item.이름),
    반품_구분: str(item.반품_구분),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    고객명: str(item.고객명),

    수량: numOrNull(item.수량),
    공급가액: numOrNull(item.공급가액),
    반품_소재비: numOrNull(item.반품_소재비),
    반품_공임: numOrNull(item.반품_공임),
    반품_금액_합계: numOrNull(item.반품_금액_합계),
    순금_중량: numOrNull(item.순금_중량),

    반영일: dateOrEmpty(item.반영일),
    생성일시: dateOrEmpty(item.생성일시),

    order_item_id: item.order_item_id ?? null,
    bundle_id: item.bundle_id ?? null,
    rental_id: item.rental_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// Case B — source 테이블이 publication 에 포함되지 않는 한 이벤트는 오지 않는다.
// 편집 가능 필드만 동기화.
function refundsMergeRealtimeUpdate(
  prev: RefundRow,
  payloadNew: Record<string, unknown>,
): RefundRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    반품_구분: n.반품_구분 !== undefined ? str(n.반품_구분) : prev.반품_구분,
    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    공급가액: n.공급가액 !== undefined ? numOrNull(n.공급가액) : prev.공급가액,
    반품_소재비: n.반품_소재비 !== undefined ? numOrNull(n.반품_소재비) : prev.반품_소재비,
    반품_공임: n.반품_공임 !== undefined ? numOrNull(n.반품_공임) : prev.반품_공임,
    반품_금액_합계: n.반품_금액_합계 !== undefined ? numOrNull(n.반품_금액_합계) : prev.반품_금액_합계,
    순금_중량: n.순금_중량 !== undefined ? numOrNull(n.순금_중량) : prev.순금_중량,
    반영일: n.반영일 !== undefined ? dateOrEmpty(n.반영일) : prev.반영일,
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
