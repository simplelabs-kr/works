// Rentals (대여) grid configuration — Case B (직접 JOIN).
//
// search_rentals / count_rentals RPC 가 rentals + 연관 테이블을 직접 JOIN
// 해서 shape 을 만들어 준다. flat table 은 없으므로 realtime 전파도 없다.
// DataGrid 는 realtimeTable 을 요구하지만 source 테이블 ('rentals') 을
// 지정해 두면 publication 에 포함되지 않는 한 이벤트는 오지 않는다
// (의도된 no-op).
//
// ⚠️ 암묵적 계약:
//   - col.data 는 RPC 반환 컬럼명과 정확히 일치
//   - readOnly: false 컬럼은 RENTALS_EDITABLE_FIELDS 에 등록
//   - JOIN 유래 컬럼 (브랜드명/브랜드코드/제품명) 및 고유번호/생성일시 는 readOnly
//   - FK UUID (brand_id / order_item_id / bundle_id) 는 타입엔 유지하되
//     COLUMNS 카탈로그에는 넣지 않는다 (사용자에게 의미 없음)

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import { 현황Renderer } from './rentalsRenderers'
import type { RentalItem, RentalRow } from './rentalsTypes'

export const RENTALS_VIEW_PAGE_KEY = 'rentals'

// Row 필드명 → rentals 테이블 컬럼명. PATCH 대상.
export const RENTALS_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '현황': '현황',
  '반납': '반납',
  '수량': '수량',
  '공급가액': '공급가액',
  '공임': '공임',
  '소재비': '소재비',
  '기준_소재비': '기준_소재비',
  '중량': '중량',
  '순금_중량': '순금_중량',
  '생산시작일': '생산시작일',
  '반품_번들명': '반품_번들명',
  '디자이너_노트': '디자이너_노트',
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
// ⚠️ 기본 정렬 (생성일시 DESC) 은 PageConfig 에 직접 설정할 수 없어
//    서버/RPC 기본 정렬 또는 저장 뷰로 제공된다.
export const RENTALS_COLUMNS = [
  // ── 식별 / 설명 ─────────────────────────────────────────────
  { data: '이름',       title: '이름',       readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '고유번호',   title: '고유번호',   readOnly: true,  width: 120, fieldType: 'text' as FieldType },

  // ── 브랜드 / 제품 (JOIN 유래, readOnly) ───────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true,  width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },
  { data: '제품명',     title: '제품명',     readOnly: true,  width: 220, fieldType: 'text' as FieldType },

  // ── 상태 ───────────────────────────────────────────────────
  { data: '현황',       title: '현황',       readOnly: false, width: 120, fieldType: 'select'   as FieldType, renderer: 현황Renderer },
  { data: '반납',       title: '반납',       readOnly: false, width: 70,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 수량 / 가격 ────────────────────────────────────────────
  { data: '수량',         title: '수량',         readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '공급가액',     title: '공급가액',     readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '공임',         title: '공임',         readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '소재비',       title: '소재비',       readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '기준_소재비',  title: '기준 소재비',  readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '중량',         title: '중량',         readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0.[00]' } },
  { data: '순금_중량',    title: '순금 중량',    readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric', numericFormat: { pattern: '0.[00]' } },

  // ── 날짜 / 노트 ────────────────────────────────────────────
  { data: '생산시작일',   title: '생산시작일',   readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },
  { data: '반품_번들명',  title: '반품 번들명',  readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: false, width: 240, fieldType: 'longtext' as FieldType, type: 'text' },

  // ── 메타 ───────────────────────────────────────────────────
  { data: '생성일시',     title: '생성일시',     readOnly: true, width: 150, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },

  // FK UUID (brand_id / order_item_id / bundle_id) 는 의도적으로 카탈로그에서 제외.

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

function transformRentalRow(item: RentalItem): RentalRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    이름: str(item.이름),
    고유번호: str(item.고유번호),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    제품명: str(item.제품명),

    현황: str(item.현황),
    반납: boolFlag(item.반납),

    수량: numOrNull(item.수량),
    공급가액: numOrNull(item.공급가액),
    공임: numOrNull(item.공임),
    소재비: numOrNull(item.소재비),
    기준_소재비: numOrNull(item.기준_소재비),
    중량: numOrNull(item.중량),
    순금_중량: numOrNull(item.순금_중량),

    생산시작일: dateOrEmpty(item.생산시작일),
    반품_번들명: str(item.반품_번들명),
    디자이너_노트: str(item.디자이너_노트),
    생성일시: dateOrEmpty(item.생성일시),

    brand_id: item.brand_id ?? null,
    order_item_id: item.order_item_id ?? null,
    bundle_id: item.bundle_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// Case B — flat table 이 없어 JOIN 파생 컬럼은 realtime 으로 오지 않는다.
// 편집 가능 필드만 동기화. source 테이블이 publication 에 포함되지 않은
// 경우 이 함수는 호출되지 않는다 (구독 자체는 DataGrid 쪽에서 이뤄진다).
function rentalsMergeRealtimeUpdate(
  prev: RentalRow,
  payloadNew: Record<string, unknown>,
): RentalRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    현황: n.현황 !== undefined ? str(n.현황) : prev.현황,
    반납: n.반납 !== undefined ? boolFlag(n.반납) : prev.반납,
    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    공급가액: n.공급가액 !== undefined ? numOrNull(n.공급가액) : prev.공급가액,
    공임: n.공임 !== undefined ? numOrNull(n.공임) : prev.공임,
    소재비: n.소재비 !== undefined ? numOrNull(n.소재비) : prev.소재비,
    기준_소재비: n.기준_소재비 !== undefined ? numOrNull(n.기준_소재비) : prev.기준_소재비,
    중량: n.중량 !== undefined ? numOrNull(n.중량) : prev.중량,
    순금_중량: n.순금_중량 !== undefined ? numOrNull(n.순금_중량) : prev.순금_중량,
    생산시작일: n.생산시작일 !== undefined ? dateOrEmpty(n.생산시작일) : prev.생산시작일,
    반품_번들명: n.반품_번들명 !== undefined ? str(n.반품_번들명) : prev.반품_번들명,
    디자이너_노트: n.디자이너_노트 !== undefined ? str(n.디자이너_노트) : prev.디자이너_노트,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig ───────────────────────────────────────────────────────

export const rentalsPageConfig: PageConfig<RentalItem, RentalRow> = {
  pageKey: RENTALS_VIEW_PAGE_KEY,
  pageName: '대여',
  apiBase: '/api/rentals',
  // flat table 이 없어 realtime 전파 경로가 없다. source 테이블 이름을
  // 지정하지만 publication 에 포함되지 않으면 이벤트는 오지 않는다.
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
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // 레코드 수 적어 초기 로드 허용.
  initialLoadPolicy: 'auto',
}
