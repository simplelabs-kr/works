// Repairs grid configuration.
//
// 하나의 파일로 수선 관리 페이지가 완성된다 — 컬럼 카탈로그, API 베이스,
// 행 변환 / realtime 머지 함수. DataGrid 공통 컴포넌트가 나머지(HOT 마운트,
// 컬럼 순서, 필터·정렬·검색, undo·redo, 뷰 영속화, realtime 구독 셸)를
// 모두 처리한다.
//
// ⚠️ 암묵적 계약 (CHECKLIST.md):
//   - `col.data` 는 flat_repairs 물리 컬럼명과 정확히 일치
//   - `readOnly: false` 컬럼은 REPAIRS_EDITABLE_FIELDS + [id]/route.ts
//     FIELD_SPECS 양쪽에 반드시 등록
//   - JOIN 유래 name 컬럼(브랜드명/브랜드코드/제품명/고객명) 및 FK 키
//     (brand_id/product_id/order_item_id/bundle_id) 는 readOnly

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { RepairItem, RepairRow } from './repairsTypes'

export const REPAIRS_VIEW_PAGE_KEY = 'repairs'

// Row 필드명 → repairs 테이블 컬럼명. PATCH 가 허용하는 컬럼과 정확히
// 일치. JOIN 유래 파생 / FK 키는 포함하지 않아 자동으로 read-only.
export const REPAIRS_EDITABLE_FIELDS: Record<string, string> = {
  '수선_내용': '수선_내용',
  '소재': '소재',
  '수량': '수량',
  '전_중량': '전_중량',
  '수선_비용_조정': '수선_비용_조정',
  '비용_조정_사유': '비용_조정_사유',
  '수선시작일': '수선시작일',
  '데드라인': '데드라인',
  '작업_위치': '작업_위치',
  '검수': '검수',
  '포장': '포장',
  '수령': '수령',
  '이동_확인': '이동_확인',
  '원부자재_구매_필요': '원부자재_구매_필요',
  '생성자': '생성자',
  '검수자': '검수자',
  '비고': '비고',
  '생성일시': '생성일시',
}

// Handsontable datePickerConfig — works 페이지와 동일하게 한글 레이블
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

// 컬럼 카탈로그. 사용자 제공 순서 그대로 — flat_repairs 물리 순서와 일치.
// ⚠️ 기본 정렬 (수선시작일 DESC) 은 PageConfig 에 직접 설정할 수 없어
//    서버/RPC 기본 정렬 또는 저장 뷰(user_view_presets) 로 제공된다.
export const REPAIRS_COLUMNS = [
  // ── 식별 ───────────────────────────────────────────────────────────
  { data: '고유번호',   title: '고유번호',   readOnly: true,  width: 120, fieldType: 'text' as FieldType },

  // ── 브랜드 / 제품 / 고객 (JOIN 유래) ──────────────────────────────
  { data: '브랜드명',   title: '브랜드',     readOnly: true,  width: 140, fieldType: 'text' as FieldType },
  { data: '브랜드코드', title: '브랜드 코드', readOnly: true, width: 100, fieldType: 'text' as FieldType },
  { data: '제품명',     title: '제품명',     readOnly: true,  width: 220, fieldType: 'text' as FieldType },
  { data: '고객명',     title: '고객명',     readOnly: true,  width: 120, fieldType: 'text' as FieldType },

  // ── 수선 내용 ──────────────────────────────────────────────────────
  { data: '수선_내용',  title: '수선 내용',  readOnly: false, width: 220, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '수선_항목',  title: '수선 항목',  readOnly: true,  width: 140, fieldType: 'text'     as FieldType },
  { data: '소재',       title: '소재',       readOnly: false, width: 100, fieldType: 'select'   as FieldType },
  { data: '수량',       title: '수량',       readOnly: false, width: 80,  fieldType: 'number'   as FieldType, type: 'numeric', numericFormat: { pattern: '0.[00]' } },
  { data: '전_중량',    title: '전 중량',    readOnly: false, width: 90,  fieldType: 'number'   as FieldType, type: 'numeric' },

  // ── 비용 ───────────────────────────────────────────────────────────
  // 수선_비용: repair_costs 룩업에서 자동 산출되는 값 — 읽기 전용
  { data: '수선_비용',       title: '수선 비용',       readOnly: true,  width: 110, fieldType: 'number' as FieldType },
  { data: '수선_비용_조정',  title: '수선 비용 조정',  readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  // 최종_수선_비용: DB formula (수선_비용 + 수선_비용_조정) — 읽기 전용
  { data: '최종_수선_비용',  title: '최종 수선 비용',  readOnly: true,  width: 120, fieldType: 'number' as FieldType },
  { data: '비용_조정_사유',  title: '비용 조정 사유',  readOnly: false, width: 180, fieldType: 'longtext' as FieldType, type: 'text' },

  // ── 원래 각인 (참고용) ─────────────────────────────────────────────
  { data: '원래_각인_문구', title: '원래 각인 문구', readOnly: true, width: 140, fieldType: 'text' as FieldType },
  { data: '원래_각인_폰트', title: '원래 각인 폰트', readOnly: true, width: 100, fieldType: 'text' as FieldType },

  // ── 스케줄 / 위치 ──────────────────────────────────────────────────
  { data: '수선시작일', title: '수선시작일', readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },
  { data: '데드라인',   title: '데드라인',   readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },
  { data: '작업_위치',  title: '작업 위치',  readOnly: false, width: 130, fieldType: 'select' as FieldType },

  // ── 체크박스 ───────────────────────────────────────────────────────
  { data: '검수',              title: '검수',        readOnly: false, width: 60, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '포장',              title: '포장',        readOnly: false, width: 60, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '수령',              title: '수령',        readOnly: false, width: 60, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '이동_확인',         title: '이동 확인',   readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '원부자재_구매_필요', title: '원부자재 구매 필요', readOnly: false, width: 120, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 작성자 / 메타 ──────────────────────────────────────────────────
  { data: '생성자',  title: '생성자',  readOnly: false, width: 100, fieldType: 'text' as FieldType, maxLength: 100 },
  { data: '검수자',  title: '검수자',  readOnly: false, width: 100, fieldType: 'text' as FieldType, maxLength: 100 },
  { data: '비고',    title: '비고',    readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '생성일시', title: '생성일시', readOnly: false, width: 150, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date', datePickerConfig },

  // FK UUID 컬럼(brand_id / product_id / order_item_id / bundle_id) 은
  // 그리드 표시에서는 제외한다 (order-items worksConfig 와 동일 패턴).
  // 타입/API 응답에는 유지돼 있어 추후 링크 구현 시 참조 가능.

  // ── 타임스탬프 (읽기 전용) ─────────────────────────────────────────
  { data: 'created_at', title: 'created_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
  { data: 'updated_at', title: 'updated_at', readOnly: true, width: 160, fieldType: 'date' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REPAIRS_COL_HEADERS: string[] = (REPAIRS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformRepairRow(item: RepairItem): RepairRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),

    브랜드명: str(item.브랜드명),
    브랜드코드: str(item.브랜드코드),
    제품명: str(item.제품명),
    고객명: str(item.고객명),

    수선_내용: str(item.수선_내용),
    수선_항목: str(item.수선_항목),
    소재: str(item.소재),
    수량: numOrNull(item.수량),
    전_중량: numOrNull(item.전_중량),

    수선_비용: numOrNull(item.수선_비용),
    수선_비용_조정: numOrNull(item.수선_비용_조정),
    최종_수선_비용: numOrNull(item.최종_수선_비용),
    비용_조정_사유: str(item.비용_조정_사유),

    원래_각인_문구: str(item.원래_각인_문구),
    원래_각인_폰트: str(item.원래_각인_폰트),

    수선시작일: dateOrEmpty(item.수선시작일),
    데드라인: dateOrEmpty(item.데드라인),
    작업_위치: str(item.작업_위치),

    검수: boolFlag(item.검수),
    포장: boolFlag(item.포장),
    수령: boolFlag(item.수령),
    이동_확인: boolFlag(item.이동_확인),
    원부자재_구매_필요: boolFlag(item.원부자재_구매_필요),

    생성자: str(item.생성자),
    검수자: str(item.검수자),
    비고: str(item.비고),
    생성일시: dateOrEmpty(item.생성일시),

    brand_id: item.brand_id ?? null,
    product_id: item.product_id ?? null,
    order_item_id: item.order_item_id ?? null,
    bundle_id: item.bundle_id ?? null,
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// flat_repairs 테이블 UPDATE 수신 시 모든 표시 컬럼을 동기화한다.
// flat_repairs 는 트리거로 동기화되므로 JOIN 유래 컬럼(브랜드명/제품명/
// 고객명 등) 도 페이로드에 포함된다 — 원본 테이블 구독 시절에는 값을
// 유지했지만, 이제는 실시간 반영한다.
// 수선_비용 / 최종_수선_비용 / 수선_항목 은 read-only 파생이지만
// flat_repairs 에는 저장되므로 같이 덮어쓴다.
function repairsMergeRealtimeUpdate(
  prev: RepairRow,
  payloadNew: Record<string, unknown>,
): RepairRow {
  const n = payloadNew
  return {
    ...prev,
    // JOIN 유래 읽기전용 컬럼 (flat_repairs 에 denormalized 저장)
    브랜드명: n.브랜드명 !== undefined ? str(n.브랜드명) : prev.브랜드명,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    고객명: n.고객명 !== undefined ? str(n.고객명) : prev.고객명,

    수선_내용: n.수선_내용 !== undefined ? str(n.수선_내용) : prev.수선_내용,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    전_중량: n.전_중량 !== undefined ? numOrNull(n.전_중량) : prev.전_중량,

    // DB 자동 산출 (lookup/formula) — flat_repairs 에 값 자체는 저장되므로
    // realtime 로 실시간 반영 가능 (이전에는 refetch 필요했음).
    수선_비용: n.수선_비용 !== undefined ? numOrNull(n.수선_비용) : prev.수선_비용,
    최종_수선_비용: n.최종_수선_비용 !== undefined ? numOrNull(n.최종_수선_비용) : prev.최종_수선_비용,
    수선_항목: n.수선_항목 !== undefined ? str(n.수선_항목) : prev.수선_항목,
    수선_비용_조정: n.수선_비용_조정 !== undefined ? numOrNull(n.수선_비용_조정) : prev.수선_비용_조정,
    비용_조정_사유: n.비용_조정_사유 !== undefined ? str(n.비용_조정_사유) : prev.비용_조정_사유,

    수선시작일: n.수선시작일 !== undefined ? dateOrEmpty(n.수선시작일) : prev.수선시작일,
    데드라인: n.데드라인 !== undefined ? dateOrEmpty(n.데드라인) : prev.데드라인,
    작업_위치: n.작업_위치 !== undefined ? str(n.작업_위치) : prev.작업_위치,

    검수: n.검수 !== undefined ? boolFlag(n.검수) : prev.검수,
    포장: n.포장 !== undefined ? boolFlag(n.포장) : prev.포장,
    수령: n.수령 !== undefined ? boolFlag(n.수령) : prev.수령,
    이동_확인: n.이동_확인 !== undefined ? boolFlag(n.이동_확인) : prev.이동_확인,
    원부자재_구매_필요: n.원부자재_구매_필요 !== undefined ? boolFlag(n.원부자재_구매_필요) : prev.원부자재_구매_필요,

    생성자: n.생성자 !== undefined ? str(n.생성자) : prev.생성자,
    검수자: n.검수자 !== undefined ? str(n.검수자) : prev.검수자,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    생성일시: n.생성일시 !== undefined ? dateOrEmpty(n.생성일시) : prev.생성일시,

    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig 팩토리 ────────────────────────────────────────────────

export const repairsPageConfig: PageConfig<RepairItem, RepairRow> = {
  pageKey: REPAIRS_VIEW_PAGE_KEY,
  pageName: '수선 관리',
  apiBase: '/api/repairs',
  realtimeChannel: 'repairs_changes',
  realtimeTable: 'flat_repairs',
  selectOptionsTable: 'repairs',
  columns: REPAIRS_COLUMNS,
  colHeaders: REPAIRS_COL_HEADERS,
  editableFields: REPAIRS_EDITABLE_FIELDS,
  transformRow: transformRepairRow,
  mergeRealtimeUpdate: repairsMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // flat_repairs 는 날짜 스코프가 없고 전체 건수가 커서, 기본 로딩 시
  // 전체를 한 번에 당기지 않는다. 필터/검색 지정 후 조회.
  initialLoadPolicy: 'require-filter',
}
