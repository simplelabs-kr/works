// Orders grid configuration.
//
// 하나의 파일로 발주 페이지가 완성된다 — 컬럼 카탈로그, API 베이스,
// 행 변환 / realtime 머지 함수. DataGrid 공통 컴포넌트가 나머지(HOT 마운트,
// 컬럼 순서, 필터·정렬·검색, undo·redo, 뷰 영속화, realtime 구독 셸)를
// 모두 처리한다.
//
// ⚠️ 암묵적 계약 (CHECKLIST.md):
//   - `col.data` 는 flat_orders 물리 컬럼명과 정확히 일치
//   - `readOnly: false` 컬럼은 ORDERS_EDITABLE_FIELDS 에 등록. route.ts
//     의 FIELD_SPECS 는 deriveFieldSpecs() 로 COLUMNS + EDITABLE_FIELDS
//     로부터 자동 파생 — 손으로 유지 금지.
//   - JOIN 유래 name 컬럼(브랜드명/브랜드코드/제품명/제품코드/소재명) 및 FK 키
//     (brand_id/product_id/metal_id) 는 readOnly

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { OrderItem, OrderRow } from './ordersTypes'

export const ORDERS_VIEW_PAGE_KEY = 'orders'

// Row 필드명 → orders 테이블 컬럼명. PATCH 가 허용하는 컬럼과 정확히
// 일치. JOIN 유래 파생 (브랜드명/제품명/제품코드/소재명) 및 FK 키
// (brand_id/product_id/metal_id) 는 포함하지 않아 자동으로 read-only.
export const ORDERS_EDITABLE_FIELDS: Record<string, string> = {
  '소재': '소재',
  '도금_색상': '도금_색상',
  '고객명': '고객명',
  '각인_내용': '각인_내용',
  '각인_폰트': '각인_폰트',
  '기타_옵션': '기타_옵션',
  '스톤_수동': '스톤_수동',
  '호수': '호수',
  '체인_두께': '체인_두께',
  '발주서': '발주서',
  '수량': '수량',
  '회차': '회차',
  '확정_공임': '확정_공임',
  '공임_조정액': '공임_조정액',
  '체인_길이': '체인_길이',
  '발주일': '발주일',
  '생산시작일': '생산시작일',
  '발주_입력': '발주_입력',
  '각인_여부': '각인_여부',
}

// Handsontable datePickerConfig — works/repairs 와 동일하게 한글 레이블
// 및 연/월 순서 정렬.
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

// 컬럼 카탈로그 — flat_orders 물리 순서와 일치.
export const ORDERS_COLUMNS = [
  // ── 브랜드 / 제품 / 소재 (JOIN 유래, readOnly) ──────────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true, width: 140, fieldType: 'lookup' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'lookup' as FieldType },
  { data: '제품명',     title: '제품명',     readOnly: true, width: 240, fieldType: 'lookup' as FieldType },
  { data: '제품코드',   title: '제품 코드',  readOnly: true, width: 140, fieldType: 'lookup' as FieldType },
  { data: '소재명',     title: '소재명',     readOnly: true, width: 100, fieldType: 'lookup' as FieldType },

  // ── 발주 내용 ──────────────────────────────────────────────────────
  { data: '소재',       title: '소재',       readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '도금_색상',  title: '도금 색상',  readOnly: false, width: 110, fieldType: 'text' as FieldType },
  { data: '고객명',     title: '고객명',     readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '각인_내용',  title: '각인 내용',  readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '각인_폰트',  title: '각인 폰트',  readOnly: false, width: 110, fieldType: 'text' as FieldType },
  { data: '기타_옵션',  title: '기타 옵션',  readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '스톤_수동',  title: '스톤(수동)', readOnly: false, width: 140, fieldType: 'text' as FieldType },
  { data: '호수',       title: '호수',       readOnly: false, width: 90,  fieldType: 'text' as FieldType },
  { data: '체인_두께',  title: '체인 두께',  readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '발주서',     title: '발주서',     readOnly: false, width: 160, fieldType: 'text' as FieldType },

  // ── 숫자 (integer) ────────────────────────────────────────────────
  { data: '수량',         title: '수량',         readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0,0' } },
  { data: '회차',         title: '회차',         readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0,0' } },
  { data: '확정_공임',    title: '확정 공임',    readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0,0' } },
  { data: '공임_조정액',  title: '공임 조정액',  readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0,0' } },

  // ── 숫자 (numeric) ────────────────────────────────────────────────
  { data: '체인_길이',    title: '체인 길이',    readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0.[00]' } },

  // ── 날짜 ────────────────────────────────────────────────────────────
  { data: '발주일',     title: '발주일',     readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },
  { data: '생산시작일', title: '생산시작일', readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },

  // ── 체크박스 ───────────────────────────────────────────────────────
  { data: '발주_입력',  title: '발주 입력',  readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '각인_여부',  title: '각인 여부',  readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 메타 (readOnly text) ───────────────────────────────────────────
  { data: '생성일시',   title: '생성일시',   readOnly: true, width: 150, fieldType: 'text' as FieldType },

  // FK UUID 컬럼(brand_id / product_id / metal_id) 은 그리드 표시에서는
  // 제외한다. 타입/API 응답에는 유지돼 추후 링크 구현 시 참조 가능.

  // ── 타임스탬프 (읽기 전용) ─────────────────────────────────────────
  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: 'updated_at', title: 'updated_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORDERS_COL_HEADERS: string[] = (ORDERS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformOrderRow(item: OrderItem): OrderRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    소재명: str(item.소재명),

    소재: str(item.소재),
    도금_색상: str(item.도금_색상),
    고객명: str(item.고객명),
    각인_내용: str(item.각인_내용),
    각인_폰트: str(item.각인_폰트),
    기타_옵션: str(item.기타_옵션),
    스톤_수동: str(item.스톤_수동),
    호수: str(item.호수),
    체인_두께: str(item.체인_두께),
    발주서: str(item.발주서),

    수량: numOrNull(item.수량),
    회차: numOrNull(item.회차),
    확정_공임: numOrNull(item.확정_공임),
    공임_조정액: numOrNull(item.공임_조정액),

    체인_길이: numOrNull(item.체인_길이),

    발주일: dateOrEmpty(item.발주일),
    생산시작일: dateOrEmpty(item.생산시작일),

    발주_입력: boolFlag(item.발주_입력),
    각인_여부: boolFlag(item.각인_여부),

    생성일시: str(item.생성일시),

    brand_id: item.brand_id ?? null,
    product_id: item.product_id ?? null,
    metal_id: item.metal_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// flat_orders 테이블 UPDATE 수신 시 모든 표시 컬럼을 동기화한다.
// flat_orders 는 트리거로 동기화되므로 JOIN 유래 컬럼(브랜드명/제품명/
// 제품코드/소재명) 도 페이로드에 포함된다.
function ordersMergeRealtimeUpdate(
  prev: OrderRow,
  payloadNew: Record<string, unknown>,
): OrderRow {
  const n = payloadNew
  return {
    ...prev,
    // JOIN 유래 readOnly (flat_orders 에 denormalized 저장)
    브랜드명: n.브랜드명 !== undefined ? str(n.브랜드명) : prev.브랜드명,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    소재명: n.소재명 !== undefined ? str(n.소재명) : prev.소재명,

    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    도금_색상: n.도금_색상 !== undefined ? str(n.도금_색상) : prev.도금_색상,
    고객명: n.고객명 !== undefined ? str(n.고객명) : prev.고객명,
    각인_내용: n.각인_내용 !== undefined ? str(n.각인_내용) : prev.각인_내용,
    각인_폰트: n.각인_폰트 !== undefined ? str(n.각인_폰트) : prev.각인_폰트,
    기타_옵션: n.기타_옵션 !== undefined ? str(n.기타_옵션) : prev.기타_옵션,
    스톤_수동: n.스톤_수동 !== undefined ? str(n.스톤_수동) : prev.스톤_수동,
    호수: n.호수 !== undefined ? str(n.호수) : prev.호수,
    체인_두께: n.체인_두께 !== undefined ? str(n.체인_두께) : prev.체인_두께,
    발주서: n.발주서 !== undefined ? str(n.발주서) : prev.발주서,

    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    회차: n.회차 !== undefined ? numOrNull(n.회차) : prev.회차,
    확정_공임: n.확정_공임 !== undefined ? numOrNull(n.확정_공임) : prev.확정_공임,
    공임_조정액: n.공임_조정액 !== undefined ? numOrNull(n.공임_조정액) : prev.공임_조정액,

    체인_길이: n.체인_길이 !== undefined ? numOrNull(n.체인_길이) : prev.체인_길이,

    발주일: n.발주일 !== undefined ? dateOrEmpty(n.발주일) : prev.발주일,
    생산시작일: n.생산시작일 !== undefined ? dateOrEmpty(n.생산시작일) : prev.생산시작일,

    발주_입력: n.발주_입력 !== undefined ? boolFlag(n.발주_입력) : prev.발주_입력,
    각인_여부: n.각인_여부 !== undefined ? boolFlag(n.각인_여부) : prev.각인_여부,

    생성일시: n.생성일시 !== undefined ? str(n.생성일시) : prev.생성일시,

    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig 팩토리 ────────────────────────────────────────────────

export const ordersPageConfig: PageConfig<OrderItem, OrderRow> = {
  pageKey: ORDERS_VIEW_PAGE_KEY,
  pageName: '발주',
  apiBase: '/api/orders',
  realtimeChannel: 'orders_changes',
  realtimeTable: 'flat_orders',
  selectOptionsTable: 'orders',
  columns: ORDERS_COLUMNS,
  colHeaders: ORDERS_COL_HEADERS,
  editableFields: ORDERS_EDITABLE_FIELDS,
  transformRow: transformOrderRow,
  mergeRealtimeUpdate: ordersMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // flat_orders 는 162K 건 규모라 전체 로드 금지 — 필터/검색 지정 후 조회.
  initialLoadPolicy: 'require-filter',
}
