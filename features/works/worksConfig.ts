// Works grid configuration — column definitions and related constants for
// the flat_order_details table. Pulled out of WorksGrid.tsx so the grid
// component itself stays close to pure DataGrid behavior; this file is the
// single place where order-item-specific schema lives.

import type { PageConfig } from '@/components/datagrid/types'
import type { FieldType, Item, Row } from './worksTypes'
import {
  attachmentRenderer,
  checkboxRenderer,
  imageRenderer,
  purchaseStatusRenderer,
  사출방식Renderer,
  작업위치Renderer,
} from './worksRenderers'

// page_key stored in user_view_settings. Other grids (products, bundles, …)
// will pick their own page_key when they come online.
export const VIEW_PAGE_KEY = 'works'

// 편집 가능 컬럼 → order_items 필드명 매핑
export const EDITABLE_FIELD_MAP: Record<string, string> = {
  '중량': '중량',
  '발주_수량': '발주_수량',
  '수량_조정': '수량_조정',
  '급자': '급자',
  '데드라인': '데드라인',
  '검수': '검수',
  '포장': '포장',
  '출고': '출고',
  'rp_출력_시작': 'rp_출력_시작',
  '왁스_파트_전달': '왁스_파트_전달',
  '주물_후_수량': '주물_후_수량',
  '디자이너_노트': '디자이너_노트',
  '작업_위치': '작업_위치',
  '사출_방식': '사출_방식',
  'reference_files': 'reference_files',
}

// No. / 체크박스 컬럼은 DataGrid 공통 컴포넌트가 vi=0 자리에 자동으로
// 주입한다. 여기에는 도메인 컬럼만 정의한다.
export const COLUMNS = [
  { data: 'images', title: '이미지', readOnly: true, width: 80, fieldType: 'image' as FieldType, renderer: imageRenderer },
  { data: 'reference_files', title: '참고파일', readOnly: false, width: 80, fieldType: 'attachment' as FieldType, renderer: attachmentRenderer, editor: false },
  { data: '제품명_코드',   title: '제품명[코드]',  readOnly: true,  width: 300, fieldType: 'lookup'   as FieldType },
  { data: 'metal_name',    title: '소재',    readOnly: true,  width: 100, fieldType: 'lookup'   as FieldType },
  { data: 'metal_purity',  title: '함량비',  readOnly: true,  width: 70,  fieldType: 'number'   as FieldType },
  { data: '발주일',        title: '발주일',  readOnly: true,  width: 110, fieldType: 'date'     as FieldType },
  { data: '생산시작일',    title: '생산시작일', readOnly: true, width: 110, fieldType: 'date'    as FieldType },
  { data: '데드라인',   title: '데드라인',  readOnly: false, width: 110, fieldType: 'date' as FieldType, type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true, editor: 'date',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datePickerConfig: {
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
        const monthLabel = labels[0]  // 첫 번째가 월
        const yearLabel = labels[1]   // 두 번째가 년도
        if (yearLabel && monthLabel && monthLabel.previousElementSibling !== yearLabel) {
          title.insertBefore(yearLabel, monthLabel)
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  },
  // 출고예정일: 데드라인 / 생산시작일+제작_소요일 에서 workday 계산 — formula
  { data: '출고예정일', title: '출고예정일', readOnly: true,  width: 110, fieldType: 'formula' as FieldType, outputType: 'date' as FieldType },
  { data: '시세_g당',      title: '시세(g당)', readOnly: true, width: 100, fieldType: 'number'  as FieldType },
  // 소재비: 중량 × 시세 계산값 — formula
  { data: '소재비',        title: '소재비',  readOnly: true,  width: 100, fieldType: 'formula'  as FieldType, outputType: 'number' as FieldType },
  { data: '발주_수량',     title: '발주 수량', readOnly: false, width: 80, fieldType: 'number'  as FieldType, type: 'numeric' },
  { data: '수량_조정',     title: '수량 조정', readOnly: false, width: 80, fieldType: 'number'  as FieldType, type: 'numeric' },
  // 수량: GENERATED ALWAYS (발주_수량 + 수량_조정) — 편집 불가
  { data: '수량',          title: '수량',    readOnly: true,  width: 70,  fieldType: 'number'   as FieldType },
  { data: '급자',          title: '급자',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '호수',          title: '호수',    readOnly: true,  width: 70,  fieldType: 'text'     as FieldType },
  { data: '고객명',        title: '고객명',  readOnly: true,  width: 100, fieldType: 'lookup'   as FieldType },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '중량',          title: '중량',    readOnly: false, width: 70,  fieldType: 'number'   as FieldType, type: 'numeric' },
  { data: '검수',          title: '검수',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '기준_중량',     title: '기준 중량', readOnly: true, width: 100, fieldType: 'number'  as FieldType },
  // 허용_중량_범위 / 중량_검토: 기준_중량·중량 기반 계산 — formula
  { data: '허용_중량_범위', title: '허용 중량 범위', readOnly: true, width: 130, fieldType: 'formula' as FieldType },
  { data: '중량_검토',     title: '중량 검토', readOnly: true, width: 80, fieldType: 'formula'  as FieldType },
  { data: '기타_옵션',     title: '기타 옵션', readOnly: true, width: 120, fieldType: 'text'    as FieldType },
  { data: '각인_내용',     title: '각인 내용', readOnly: true, width: 100, fieldType: 'text'    as FieldType },
  { data: '각인_폰트',     title: '각인 폰트', readOnly: true, width: 80, fieldType: 'text'     as FieldType },
  { data: '기본_공임',     title: '기본 공임', readOnly: true, width: 80, fieldType: 'number'   as FieldType },
  { data: '공임_조정액',   title: '공임 조정액', readOnly: true, width: 80, fieldType: 'number' as FieldType },
  // 확정_공임: 기본_공임 + 공임_조정액 — formula
  { data: '확정_공임',     title: '확정 공임', readOnly: true, width: 80, fieldType: 'formula'  as FieldType, outputType: 'number' as FieldType },
  // 번들_명칭: bundles JOIN 식별자 — lookup
  { data: '번들_명칭',     title: '번들 명칭', readOnly: true, width: 120, fieldType: 'lookup'  as FieldType },
  // derived:true → formula 아이콘
  { data: '원부자재',      title: '원부자재',  readOnly: true, width: 150, fieldType: 'formula' as FieldType, derived: true },
  { data: '발주_현황',     title: '발주 현황', readOnly: true, width: 150, fieldType: 'formula' as FieldType, derived: true, renderer: purchaseStatusRenderer },
  { data: '작업_위치',     title: '작업 위치', readOnly: false, width: 130, fieldType: 'select' as FieldType, renderer: 작업위치Renderer },
  { data: '검수_유의',     title: '검수 포인트', readOnly: true, width: 150, fieldType: 'text'   as FieldType },
  { data: '도금_색상',     title: '도금 색상', readOnly: true, width: 90, fieldType: 'text'     as FieldType },
  { data: '사출_방식',     title: '사출 방식', readOnly: false, width: 90, fieldType: 'select' as FieldType, renderer: 사출방식Renderer },
  { data: '가다번호_목록', title: '가다번호',  readOnly: true, width: 100, fieldType: 'text'    as FieldType },
  { data: '가다_위치_목록', title: '가다 위치', readOnly: true, width: 100, fieldType: 'text'   as FieldType },
  { data: '주물_후_수량',  title: '주물 후 수량', readOnly: false, width: 80, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '포장',          title: '포장',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '순금_중량',     title: '순금 중량', readOnly: true, width: 100, fieldType: 'number'  as FieldType },
  { data: 'rp_출력_시작',  title: 'RP 출력 시작', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '왁스_파트_전달', title: '왁스 파트 전달', readOnly: false, width: 100, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COL_HEADERS: string[] = (COLUMNS as any[]).map((c) => c.title ?? '')

// ── Field type icons ─────────────────────────────────────────────────────────
//
// lucide-react 를 의존성으로 끌지 않고 lucide 원본 SVG path 데이터를 직접
// 임베드해 사용한다. 모든 아이콘은 24x24 viewBox (lucide 표준) 에 렌더
// 사이즈 13x13. `stroke-width` 는 아이콘 타입별로 다소 조정해 13px 출력
// 크기에서 잘 보이도록 맞춤.

export function getFieldTypeIcon(type: FieldType): string {
  // 색상은 한 곳에서 관리 — 모든 fieldType 아이콘이 동일한 톤을 공유.
  const C = '#4B5563' // gray-600 (이전: #9CA3AF gray-400 — 가독성 개선)
  const svg = (paths: string, sw = 2) =>
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${C}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`

  const icons: Record<FieldType, string> = {
    // 'A' glyph — short (single-line) text. Airtable-style.
    // dominant-baseline="central" 로 글리프를 SVG 박스 수직 중앙에 위치시킴
    // (기본 baseline 렌더는 위쪽으로 치우쳐 보임).
    text:     `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="7" y="7" font-size="12" font-weight="700" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" fill="${C}" stroke="none" text-anchor="middle" dominant-baseline="central">A</text></svg>`,
    // AlignLeft — long text
    longtext: svg(`<path d="M21 6H3"/><path d="M17 12H3"/><path d="M21 18H3"/>`),
    // Hash — number / numeric / integer
    number:   svg(`<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>`),
    // Calendar — date
    date:     svg(`<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>`),
    // CheckSquare — checkbox / boolean
    checkbox: svg(`<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`),
    // ChevronDown inside circle border — select
    select:   svg(`<circle cx="12" cy="12" r="10"/><polyline points="8 10 12 14 16 10"/>`),
    // 'fx' glyph — formula / derived (italic f + smaller x)
    // dominant-baseline="central" 로 SVG 박스 수직 중앙 정렬.
    formula:  `<svg width="14" height="13" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="7" font-size="11" font-weight="600" font-family="Georgia, 'Times New Roman', serif" fill="${C}" stroke="none" font-style="italic" dominant-baseline="central">f</text><text x="7" y="8" font-size="9" font-weight="600" font-family="Georgia, 'Times New Roman', serif" fill="${C}" stroke="none" font-style="italic" dominant-baseline="central">x</text></svg>`,
    // Image (lucide)
    image:    svg(`<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>`),
    // Paperclip — attachment
    attachment: svg(`<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>`),
    // Link2 — link
    link:     svg(`<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>`),
    // Link2 + small dot cluster — linklist (bidirectional chip list)
    linklist: svg(`<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/><circle cx="20" cy="4" r="1.5" fill="${C}" stroke="none"/>`),
    // ArrowUpRight — lookup (readOnly + JOIN 파생 text)
    lookup:   svg(`<path d="M7 7h10v10"/><path d="m7 17 10-10"/>`),
  }
  return icons[type] ?? ''
}

// ── Workday helpers ──────────────────────────────────────────────────────────
//
// Business-calendar math for the 출고예정일 derived column. Skip weekends
// and any holiday in the `hs` set; nextWorkday(d) returns the next working
// day strictly after `d`, addWorkdays(start, n) returns the working day
// `n` workdays after `start`. Pure functions — safe to call from transform
// and merge hooks.

function isWorkday(date: Date, hs: Set<string>): boolean {
  const day = date.getDay()
  const str = date.toISOString().slice(0, 10)
  return day !== 0 && day !== 6 && !hs.has(str)
}

function nextWorkday(date: Date, hs: Set<string>): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  while (!isWorkday(next, hs)) next.setDate(next.getDate() + 1)
  return next
}

function addWorkdays(startDate: Date, days: number, hs: Set<string>): Date {
  let count = 0
  const current = new Date(startDate)
  while (count < days) {
    const str = current.toISOString().slice(0, 10)
    const day = current.getDay()
    if (day !== 0 && day !== 6 && !hs.has(str)) count++
    if (count < days) current.setDate(current.getDate() + 1)
  }
  return nextWorkday(current, hs)
}

// ── Derived field helpers ────────────────────────────────────────────────────

// Row-shape calculator for 출고예정일, reused by realtime merge and local
// edit recompute. 데드라인 takes precedence (business rule: "ship date is
// the first workday after 데드라인"); falls back to 생산시작일 + 제작_소요일.
function calcShipDateFromRow(
  row: Pick<Row, '데드라인' | '생산시작일' | '제작_소요일'>,
  hs: Set<string>,
): string {
  if (row.데드라인) {
    return nextWorkday(new Date(row.데드라인), hs).toISOString().slice(0, 10)
  }
  if (row.생산시작일 && row.제작_소요일) {
    return addWorkdays(new Date(row.생산시작일), Number(row.제작_소요일), hs)
      .toISOString()
      .slice(0, 10)
  }
  return '-'
}

function calcShipDateFromItem(item: Item, hs: Set<string>): string {
  if (item.데드라인) {
    return nextWorkday(new Date(item.데드라인), hs).toISOString().slice(0, 10)
  }
  if (item.생산시작일 && item.제작_소요일) {
    return addWorkdays(new Date(item.생산시작일), Number(item.제작_소요일), hs)
      .toISOString()
      .slice(0, 10)
  }
  return '-'
}

function formatDate(val: string | null | undefined): string {
  if (!val) return ''
  return String(val).slice(0, 10)
}

// ── Row transform (Item → Row) ───────────────────────────────────────────────

// flat_order_details row → display Row. DB 측에서 제품명_코드 (제품명 + `[`
// + 고유_번호 끝 4자리 hex + `]`) / 출고예정일 (workday math) / 순금_중량
// (mass × purity%) 를 이미 계산해 내려주므로 여기서는 null 정규화만 한다.
// Passed to DataGrid via `worksPageConfig.transformRow`.
function transformWorksRow(item: Item, ctx: { holidays: Set<string> }): Row {
  const hs = ctx.holidays
  // 출고예정일: DB 측 computed 컬럼을 우선, 없으면 로컬 계산(휴일 캐시 활용)으로 폴백.
  // 편집 직후 realtime 은 order_items 기준이므로 로컬 재계산 경로가 필요하다.
  const shipFromDb = item.출고예정일 ? String(item.출고예정일).slice(0, 10) : ''
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    고유_번호: item.고유_번호 ?? '',
    제품명: item.제품명 ?? '',
    제품명_코드: item.제품명_코드 ?? '',
    metal_name: item.metal_name ?? '',
    metal_purity: item.metal_purity != null ? String(item.metal_purity) : null,
    발주일: formatDate(item.발주일),
    생산시작일: formatDate(item.생산시작일),
    제작_소요일: item.제작_소요일 ?? null,
    데드라인: formatDate(item.데드라인),
    출고예정일: shipFromDb || calcShipDateFromItem(item, hs),
    시세_g당: item.시세_g당 ?? null,
    소재비: item.소재비 ?? null,
    발주_수량: item.발주_수량 ?? null,
    수량_조정: item.수량_조정 ?? null,
    수량: item.수량 ?? null,
    급자: item.급자 ?? false,
    호수: item.호수 ?? null,
    고객명: item.고객명 ?? '',
    디자이너_노트: item.디자이너_노트 ?? '',
    중량: item.중량 ?? null,
    검수: item.검수 ?? false,
    기준_중량: item.기준_중량 ?? null,
    허용_중량_범위: item.허용_중량_범위 ?? '',
    중량_검토: item.중량_검토 ?? '',
    기타_옵션: item.기타_옵션 ?? '',
    각인_내용: item.각인_내용 ?? '',
    각인_폰트: item.각인_폰트 ?? '',
    기본_공임: item.기본_공임 ?? null,
    공임_조정액: item.공임_조정액 ?? null,
    확정_공임: item.확정_공임 ?? null,
    번들_명칭: item.번들_명칭 ?? '',
    원부자재: '',
    발주_현황: '',
    작업_위치: item.작업_위치 ?? '',
    검수_유의: item.검수_유의 ?? '',
    도금_색상: item.도금_색상 ?? '',
    사출_방식: item.사출_방식 ?? '',
    가다번호_목록: item.가다번호_목록 ?? null,
    가다_위치_목록: item.가다_위치_목록 ?? null,
    주물_후_수량: item.주물_후_수량 ?? null,
    포장: item.포장 ?? false,
    순금_중량: item.순금_중량 ?? null,
    rp_출력_시작: item.rp_출력_시작 ?? false,
    왁스_파트_전달: item.왁스_파트_전달 ?? false,
    images: item.images ?? [],
    reference_files: item.reference_files ?? [],
  }
}

// ── Realtime UPDATE merge ────────────────────────────────────────────────────

// Given the previous row and `payload.new` from a Supabase realtime UPDATE
// (flat_order_details 기준), 표시 컬럼 전체를 동기화한다. flat_order_details
// 는 order_items/products/brands/bundles 변경 시 트리거로 갱신되므로 이제는
// JOIN 유래 컬럼(제품명/brand_name/metal_name 등)도 realtime 으로 전파된다.
// `원부자재` / `발주_현황` 은 아직 flat 에 물리 컬럼이 없는 derived 컬럼이라
// 이전 값을 유지한다.
function worksMergeRealtimeUpdate(
  prev: Row,
  payloadNew: Record<string, unknown>,
  ctx: { holidays: Set<string> },
): Row {
  // payload.new 는 flat_order_details 한 행 전체 → Item 캐스팅 후 재변환
  const nextFromFlat = transformWorksRow(payloadNew as Item, ctx)
  return {
    ...nextFromFlat,
    // derived(미물리화) 컬럼은 보존 — 별도 소스(purchase orders/원부자재)에서 갱신됨
    원부자재: prev.원부자재,
    발주_현황: prev.발주_현황,
  }
}

// ── Derived-field hooks for local edits ──────────────────────────────────────

// Called by DataGrid after a user edit (and on rollback). Only 데드라인
// has a derived partner (출고예정일), so every other field returns `{}`.
function worksRecomputeDerivedAfterEdit(
  prev: Row,
  field: string,
  candidateValue: unknown,
  ctx: { holidays: Set<string> },
): Partial<Row> {
  if (field !== '데드라인') return {}
  const newDeadline = candidateValue ? String(candidateValue).slice(0, 10) : ''
  return {
    데드라인: newDeadline,
    출고예정일: calcShipDateFromRow({ ...prev, 데드라인: newDeadline }, ctx.holidays),
  }
}

function worksRecomputeDerivedOnHolidayChange(row: Row, holidays: Set<string>): Row {
  const newShip = calcShipDateFromRow(row, holidays)
  if (newShip === row.출고예정일) return row
  return { ...row, 출고예정일: newShip }
}

// ── PageConfig factory ───────────────────────────────────────────────────────

// The single object the works page passes into DataGrid. Adding a new page
// (products, bundles, trash) means authoring another one of these — not
// touching DataGrid itself.
export const worksPageConfig: PageConfig<Item, Row> = {
  pageKey: VIEW_PAGE_KEY,
  apiBase: '/api/order-items',
  realtimeChannel: 'order_items_changes',
  realtimeTable: 'flat_order_details',
  selectOptionsTable: 'order_items',
  columns: COLUMNS,
  colHeaders: COL_HEADERS,
  editableFields: EDITABLE_FIELD_MAP,
  transformRow: transformWorksRow,
  mergeRealtimeUpdate: worksMergeRealtimeUpdate,
  recomputeDerivedAfterEdit: worksRecomputeDerivedAfterEdit,
  recomputeDerivedOnHolidayChange: worksRecomputeDerivedOnHolidayChange,
  // Group-by catalog is fieldType-driven: every column whose fieldType
  // is in allowedTypes automatically becomes a valid grouping key.
  // Adding 'text' or 'date' later is a one-word change here.
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
}

// NOTE: 통합 휴지통으로 전환되어 이 페이지 전용 trash config는 삭제됨.
// /works/trash 는 이제 app/api/trash 경유의 단순 리스트 UI 를 사용한다.
// trashedMode 자체는 DataGrid 에 남아 있어 필요 시 페이지가 다시 사용할 수 있다.
