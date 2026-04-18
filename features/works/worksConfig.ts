// Works grid configuration — column definitions and related constants for
// the flat_order_details table. Pulled out of WorksGrid.tsx so the grid
// component itself stays close to pure DataGrid behavior; this file is the
// single place where order-item-specific schema lives.

import type { FieldType } from './worksTypes'
import {
  attachmentRenderer,
  checkboxRenderer,
  imageRenderer,
  noColRenderer,
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

export const COLUMNS = [
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (_row: any) => '',
    title: '',
    width: 50,
    readOnly: true,
    renderer: noColRenderer,
  },
  { data: 'images', title: '이미지', readOnly: true, width: 80, fieldType: 'image' as FieldType, renderer: imageRenderer },
  { data: 'reference_files', title: '참고파일', readOnly: false, width: 80, fieldType: 'attachment' as FieldType, renderer: attachmentRenderer, editor: false },
  { data: '제품명_코드',   title: '제품명[코드]',  readOnly: true,  width: 220, fieldType: 'text'     as FieldType },
  { data: 'metals.name',   title: '소재',    readOnly: true,  width: 100, fieldType: 'text'     as FieldType },
  { data: 'metals.purity', title: '함량비',  readOnly: true,  width: 70,  fieldType: 'text'     as FieldType },
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
  { data: '출고예정일', title: '출고예정일', readOnly: true,  width: 110, fieldType: 'formula' as FieldType, outputType: 'date' as const },
  { data: '시세_g당',      title: '시세 (g당)', readOnly: true, width: 80, fieldType: 'number'  as FieldType },
  { data: '소재비',        title: '소재비',  readOnly: true,  width: 90,  fieldType: 'number'   as FieldType },
  { data: '발주_수량',     title: '발주 수량', readOnly: true, width: 80, fieldType: 'number'   as FieldType },
  { data: '수량',          title: '수량',    readOnly: true,  width: 70,  fieldType: 'number'   as FieldType },
  { data: '호수',          title: '호수',    readOnly: true,  width: 70,  fieldType: 'text'     as FieldType },
  { data: '고객명',        title: '고객명',  readOnly: true,  width: 100, fieldType: 'text'     as FieldType },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '중량',          title: '중량',    readOnly: false, width: 70,  fieldType: 'number'   as FieldType, type: 'numeric' },
  { data: '검수',          title: '검수',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '허용_중량_범위', title: '허용 중량 범위', readOnly: true, width: 130, fieldType: 'formula' as FieldType, outputType: 'text' as const },
  { data: '중량_검토',     title: '중량 검토', readOnly: true, width: 70, fieldType: 'formula'  as FieldType, outputType: 'text' as const },
  { data: '기타_옵션',     title: '기타 옵션', readOnly: true, width: 120, fieldType: 'text'    as FieldType },
  { data: '각인_내용',     title: '각인 내용', readOnly: true, width: 100, fieldType: 'text'    as FieldType },
  { data: '각인_폰트',     title: '각인 폰트', readOnly: true, width: 80, fieldType: 'text'     as FieldType },
  { data: '기본_공임',     title: '기본 공임', readOnly: true, width: 80, fieldType: 'number'   as FieldType },
  { data: '공임_조정액',   title: '공임 조정액', readOnly: true, width: 80, fieldType: 'number' as FieldType },
  { data: '확정_공임',     title: '확정 공임', readOnly: true, width: 80, fieldType: 'number'   as FieldType },
  { data: '번들_명칭',     title: '번들 명칭', readOnly: true, width: 120, fieldType: 'text'    as FieldType },
  { data: '원부자재',      title: '원부자재',  readOnly: true, width: 150, fieldType: 'text'    as FieldType },
  { data: '발주_현황',     title: '발주 현황', readOnly: true, width: 150, fieldType: 'formula' as FieldType, outputType: 'text' as const, renderer: purchaseStatusRenderer },
  { data: '작업_위치',     title: '작업 위치', readOnly: false, width: 130, fieldType: 'select' as FieldType, renderer: 작업위치Renderer },
  { data: '검수_유의',     title: '검수 포인트', readOnly: true, width: 150, fieldType: 'text'   as FieldType },
  { data: '도금_색상',     title: '도금 색상', readOnly: true, width: 90, fieldType: 'text'     as FieldType },
  { data: '사출_방식',     title: '사출 방식', readOnly: false, width: 90, fieldType: 'select' as FieldType, renderer: 사출방식Renderer },
  { data: '가다번호',      title: '가다번호',  readOnly: true, width: 90, fieldType: 'text'     as FieldType },
  { data: '가다_위치',     title: '가다 위치', readOnly: true, width: 90, fieldType: 'text'     as FieldType },
  { data: '주물_후_수량',  title: '주물 후 수량', readOnly: false, width: 80, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '포장',          title: '포장',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '순금_중량',     title: '순금 중량', readOnly: true, width: 80, fieldType: 'formula'  as FieldType, outputType: 'number' as const },
  { data: 'rp_출력_시작',  title: 'RP 출력 시작', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '왁스_파트_전달', title: '왁스 파트 전달', readOnly: false, width: 100, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COL_HEADERS: string[] = (COLUMNS as any[]).map((c) => c.title ?? '')

// ── Field type icons ─────────────────────────────────────────────────────────

export function getFieldTypeIcon(type: FieldType): string {
  const s = 'stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"'
  const icons: Record<FieldType, string> = {
    text:     `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0.5" y="9.5" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#9CA3AF" stroke="none">A</text></svg>`,
    longtext: `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="11" y2="6"/><line x1="1" y1="9" x2="7" y2="9"/></svg>`,
    number:   `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="4.5" y1="1" x2="3" y2="11"/><line x1="8.5" y1="1" x2="7" y2="11"/><line x1="1.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="1" y1="7.5" x2="10" y2="7.5"/></svg>`,
    date:     `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1" y="2" width="10" height="9" rx="1.5"/><line x1="4" y1="1" x2="4" y2="3.5"/><line x1="8" y1="1" x2="8" y2="3.5"/><line x1="1" y1="5" x2="11" y2="5"/></svg>`,
    checkbox: `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/><polyline points="3.5,6 5.5,8 8.5,4"/></svg>`,
    select:   `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="4.5"/><polyline points="4,5.5 6,7.5 8,5.5"/></svg>`,
    formula:  `<svg width="17" height="15" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0" y="9.5" font-size="10" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#9CA3AF" stroke="none" font-style="italic">fx</text></svg>`,
    image:    `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1" y="1.5" width="10" height="9" rx="1.5"/><circle cx="4" cy="4.5" r="1"/><polyline points="1,9.5 4,6.5 6,8.5 8,6 11,9.5"/></svg>`,
    attachment: `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><path d="M6.5 2L3.5 5a2.12 2.12 0 0 0 3 3l4-4a1.41 1.41 0 0 0-2-2L4.5 6a.71.71 0 0 0 1 1L8.5 4"/></svg>`,
  }
  return icons[type] ?? ''
}
