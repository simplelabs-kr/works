'use client'

import { useEffect, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'
import { supabase } from '@/lib/supabase/client'
import SummaryBar from '@/components/works/SummaryBar'
import type { SummaryColDef } from '@/components/works/SummaryBar'
import FilterModal from '@/components/works/FilterModal'
import type { FilterCondition, FilterColDef } from '@/components/works/FilterModal'
import SortModal from '@/components/works/SortModal'
import type { SortCondition, SortColDef } from '@/components/works/SortModal'

type Orders = {
  brand_id: string | null
  product_id: string | null
  수량: number | null
  발주일: string | null
  생산시작일: string | null
  소재: string | null
  metal_id: string | null
  고객명: string | null
  각인_내용: string | null
  각인_폰트: string | null
  기타_옵션: string | null
  호수: string | null
  확정_공임: number | null
  공임_조정액: number | null
  회차: number | null
  도금_색상: string | null
  체인_길이: string | null
  체인_두께: string | null
  brands: { name: string } | null
  products: { 제품명: string; 제작_소요일: number | null } | null
  metals: { name: string; purity: string | null } | null
}

type Purchase = {
  이름: string | null
  구분: string | null
  발주: boolean | null
  수령: boolean | null
  재고_사용: boolean | null
  material_id: string | null
  materials: { 품목명: string } | null
}

type Item = {
  id: string
  updated_at: string | null
  고유_번호: string
  수량: number | null
  중량: number | null
  디자이너_노트: string | null
  데드라인: string | null
  출고일: string | null
  발송일: string | null
  중단_취소: boolean | null
  검수: boolean | null
  포장: boolean | null
  출고: boolean | null
  가다번호: string | null
  가다_위치: string | null
  작업_위치: string | null
  사출_방식: string | null
  주물_후_수량: number | null
  rp_출력_시작: boolean | null
  왁스_파트_전달: boolean | null
  bundle_id: string | null
  metal_price_id: string | null
  order_id: string | null
  orders: Orders | null
  metal_prices: { price_per_gram: number | null } | null
  products: {
    제품명: string
    제작_소요일: number | null
    기준_중량: number | null
    기본_공임: number | null
    검수_유의: string | null
    product_molds: {
      molds: {
        가다번호: string | null
        mold_positions: { 보관함_위치: string | null } | null
      } | null
    }[] | null
  } | null
  bundles: { 번들_고유번호: string | null } | null
  purchases: Purchase[] | null
}

type Row = {
  id: string
  updated_at: string | null
  고유_번호: string
  제품명: string
  제품명_코드: string
  metals: { name: string; purity: string | null }
  발주일: string
  생산시작일: string
  제작_소요일: number | null
  데드라인: string
  출고예정일: string
  시세_g당: string
  소재비: string
  발주_수량: number | null
  수량: number | null
  호수: string | null
  고객명: string
  디자이너_노트: string
  중량: number | null
  검수: boolean
  허용_중량_범위: string
  중량_검토: string
  기타_옵션: string
  각인_내용: string
  각인_폰트: string
  기본_공임: number | null
  공임_조정액: number | null
  확정_공임: number | null
  번들_명칭: string
  원부자재: string
  발주_현황: string
  작업_위치: string
  검수_유의: string
  도금_색상: string
  사출_방식: string
  가다번호: string | null
  가다_위치: string | null
  주물_후_수량: number | null
  포장: boolean
  순금_중량: string
  rp_출력_시작: boolean
  왁스_파트_전달: boolean
}

type SubmittedFilters = {
  search: string
  brand: string
  dateFrom: string
  dateTo: string
}

const SELECT_COLUMN_OPTIONS: Record<string, { value: string; bg: string }[]> = {
  '사출_방식': [
    { value: 'RP', bg: '#EDE9FE' },
    { value: '왁스', bg: '#DBEAFE' },
  ],
  '작업_위치': [
    { value: '현장', bg: '#DCFCE7' },
    { value: '검수', bg: '#DBEAFE' },
    { value: '조립', bg: '#EDE9FE' },
    { value: '마무리 광', bg: '#FEF9C3' },
    { value: '조각', bg: '#FFEDD5' },
    { value: '도금', bg: '#FEF3C7' },
    { value: '각인', bg: '#FCE7F3' },
    { value: '광실', bg: '#F3F4F6' },
    { value: '세척/검수후재작업', bg: '#CCFBF1' },
    { value: '에폭시(연마)', bg: '#FEF2F2' },
    { value: '에폭시(일반)', bg: '#FEF2F2' },
    { value: '컷팅', bg: '#F3F4F6' },
    { value: '외부', bg: '#F1F5F9' },
    { value: '대기', bg: '#F9FAFB' },
    { value: '취소', bg: '#FEE2E2' },
    { value: '조립 대기 중', bg: '#EDE9FE' },
    { value: '유화', bg: '#F3F4F6' },
    { value: '초벌', bg: '#F3F4F6' },
  ],
}

// 편집 가능 컬럼 → Supabase 컬럼명 매핑
const COLUMN_MAP: Record<string, string> = {
  '중량': '중량',
  '데드라인': '데드라인',
  '검수': '검수',
  '포장': '포장',
  'rp_출력_시작': 'rp_출력_시작',
  '왁스_파트_전달': '왁스_파트_전달',
  '주물_후_수량': '주물_후_수량',
  '디자이너_노트': '디자이너_노트',
}

const COLUMNS = [
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (_row: any) => '',
    title: '',
    width: 40,
    readOnly: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: function (_hot: any, td: HTMLTableCellElement, row: number) {
      td.textContent = String(row + 1)
      td.style.cssText = 'color:#94A3B8;font-size:11px;text-align:center;vertical-align:middle;background:#F8FAFC;border-right:1px solid #E2E8F0;padding-left:12px;'
    },
  },
  { data: '제품명_코드',   title: '제품명[코드]',    width: 220, fieldType: 'lookup'   as FieldType },
  { data: 'metals.name',   title: '소재',    readOnly: true,  width: 100, fieldType: 'lookup'   as FieldType },
  { data: 'metals.purity', title: '함량비',  readOnly: true,  width: 70,  fieldType: 'lookup'   as FieldType },
  { data: '발주일',        title: '발주일',  readOnly: true,  width: 110, fieldType: 'lookup'   as FieldType },
  { data: '생산시작일',    title: '생산시작일', readOnly: true, width: 110, fieldType: 'lookup'  as FieldType },
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
    } as any,
  },
  { data: '출고예정일', title: '출고예정일', readOnly: true,  width: 110, fieldType: 'formula' as FieldType },
  { data: '시세_g당',      title: '시세 (g당)', readOnly: true, width: 80, fieldType: 'lookup'  as FieldType },
  { data: '소재비',        title: '소재비',  readOnly: true,  width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '발주_수량',     title: '발주 수량', readOnly: true, width: 80, fieldType: 'lookup'   as FieldType },
  { data: '수량',          title: '수량',    readOnly: true,  width: 70,  fieldType: 'number'   as FieldType },
  { data: '호수',          title: '호수',    readOnly: true,  width: 70,  fieldType: 'lookup'   as FieldType },
  { data: '고객명',        title: '고객명',  readOnly: true,  width: 100, fieldType: 'lookup'   as FieldType },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '중량',          title: '중량',    readOnly: false, width: 70,  fieldType: 'number'   as FieldType, type: 'numeric' },
  { data: '검수',          title: '검수',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '허용_중량_범위', title: '허용 중량 범위', readOnly: true, width: 130, fieldType: 'formula' as FieldType },
  { data: '중량_검토',     title: '중량 검토', readOnly: true, width: 70, fieldType: 'formula'  as FieldType },
  { data: '기타_옵션',     title: '기타 옵션', readOnly: true, width: 120, fieldType: 'lookup'  as FieldType },
  { data: '각인_내용',     title: '각인 내용', readOnly: true, width: 100, fieldType: 'lookup'  as FieldType },
  { data: '각인_폰트',     title: '각인 폰트', readOnly: true, width: 80, fieldType: 'lookup'   as FieldType },
  { data: '기본_공임',     title: '기본 공임', readOnly: true, width: 80, fieldType: 'lookup'   as FieldType },
  { data: '공임_조정액',   title: '공임 조정액', readOnly: true, width: 80, fieldType: 'lookup' as FieldType },
  { data: '확정_공임',     title: '확정 공임', readOnly: true, width: 80, fieldType: 'lookup'   as FieldType },
  { data: '번들_명칭',     title: '번들 명칭', readOnly: true, width: 120, fieldType: 'lookup'  as FieldType },
  { data: '원부자재',      title: '원부자재',  readOnly: true, width: 150, fieldType: 'lookup'  as FieldType },
  { data: '발주_현황',     title: '발주 현황', readOnly: true, width: 150, fieldType: 'formula' as FieldType, renderer: purchaseStatusRenderer },
  { data: '작업_위치',     title: '작업 위치', readOnly: true,  width: 130, fieldType: 'select' as FieldType, renderer: 작업위치Renderer },
  { data: '검수_유의',     title: '검수 포인트', readOnly: true, width: 150, fieldType: 'lookup' as FieldType },
  { data: '도금_색상',     title: '도금 색상', readOnly: true, width: 90, fieldType: 'lookup'   as FieldType },
  { data: '사출_방식',     title: '사출 방식', readOnly: true,  width: 90, fieldType: 'select' as FieldType, renderer: 사출방식Renderer },
  { data: '가다번호',      title: '가다번호',  readOnly: true, width: 90, fieldType: 'lookup'   as FieldType },
  { data: '가다_위치',     title: '가다 위치', readOnly: true, width: 90, fieldType: 'lookup'   as FieldType },
  { data: '주물_후_수량',  title: '주물 후 수량', readOnly: false, width: 80, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '포장',          title: '포장',    readOnly: false, width: 50,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '순금_중량',     title: '순금 중량', readOnly: true, width: 80, fieldType: 'formula'  as FieldType },
  { data: 'rp_출력_시작',  title: 'RP 출력 시작', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '왁스_파트_전달', title: '왁스 파트 전달', readOnly: false, width: 100, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
]

// ── Field type icons ─────────────────────────────────────────────────────────

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'checkbox' | 'select' | 'lookup' | 'formula'

function getFieldTypeIcon(type: FieldType): string {
  const s = 'stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"'
  const icons: Record<FieldType, string> = {
    text:     `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0.5" y="9.5" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#9CA3AF" stroke="none">A</text></svg>`,
    longtext: `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="11" y2="6"/><line x1="1" y1="9" x2="7" y2="9"/></svg>`,
    number:   `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="4.5" y1="1" x2="3" y2="11"/><line x1="8.5" y1="1" x2="7" y2="11"/><line x1="1.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="1" y1="7.5" x2="10" y2="7.5"/></svg>`,
    date:     `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1" y="2" width="10" height="9" rx="1.5"/><line x1="4" y1="1" x2="4" y2="3.5"/><line x1="8" y1="1" x2="8" y2="3.5"/><line x1="1" y1="5" x2="11" y2="5"/></svg>`,
    checkbox: `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/><polyline points="3.5,6 5.5,8 8.5,4"/></svg>`,
    select:   `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#9CA3AF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="4.5"/><polyline points="4,5.5 6,7.5 8,5.5"/></svg>`,
    lookup:   `<svg width="17" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><path d="M2 10 L10 2"/><polyline points="5,2 10,2 10,7"/></svg>`,
    formula:  `<svg width="17" height="15" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0" y="9.5" font-size="10" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#9CA3AF" stroke="none" font-style="italic">fx</text></svg>`,
  }
  return icons[type] ?? ''
}

// ── Common select badge renderer ──────────────────────────────────────────────

function renderSelectBadge(td: HTMLTableCellElement, value: string, bg: string) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  td.style.position = 'relative'  // chevron ::after 기준점
  td.dataset.selectCol = 'true'
  if (!value) return
  const badge = document.createElement('span')
  badge.textContent = value
  badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:40px;padding:2px 8px;border-radius:9999px;font-size:13px;font-weight:500;line-height:normal;background:${bg || '#F3F4F6'};color:#111827;white-space:nowrap;`
  td.appendChild(badge)
}

// ── Purchase status renderer ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function purchaseStatusRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  if (!value) return
  const dotColor: Record<string, string> = {
    '발주 필요': '#EF4444',
    '수령 필요': '#F97316',
    '수령 완료': '#22C55E',
  }
  const color = dotColor[value]
  if (!color) return
  const wrap = document.createElement('span')
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;line-height:normal;'
  const dot = document.createElement('span')
  dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0;`
  const text = document.createElement('span')
  text.textContent = value
  text.style.cssText = 'font-size:13px;color:#111827;white-space:nowrap;'
  wrap.appendChild(dot)
  wrap.appendChild(text)
  td.appendChild(wrap)
}

// ── Custom checkbox renderer ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkboxRenderer(hot: any, td: HTMLTableCellElement, row: number, col: number, _prop: any, value: boolean) {
  td.innerHTML = ''
  // td must not add extra height — use flex to center content
  td.style.cssText += ';padding:0;overflow:hidden;cursor:default;'
  td.style.textAlign = 'center'
  td.style.verticalAlign = 'middle'
  td.style.lineHeight = '0'

  td.onmouseenter = null
  td.onmouseleave = null
  td.onclick = null

  const checked = value === true

  // Outer container: fills the td completely, flex-centers the hit target
  const outer = document.createElement('div')
  outer.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:33px;overflow:hidden;'

  // Hit target: fixed 24×24, shows hover background, contains the checkmark
  const box = document.createElement('span')
  box.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex-shrink:0;border-radius:4px;transition:background 0.1s;cursor:pointer;'

  if (checked) {
    box.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="1.5,6 5.5,10 12.5,1.5" stroke="#2D7FF9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }

  box.onmouseenter = () => { box.style.border = '1.5px solid #D1D5DB' }
  box.onmouseleave = () => { box.style.border = 'none' }

  box.onclick = (e) => {
    e.stopPropagation()
    const currentVal = hot.getDataAtCell(row, col)
    hot.setDataAtCell(row, col, currentVal !== true, 'checkboxClick')
  }

  outer.appendChild(box)
  td.appendChild(outer)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function 사출방식Renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = SELECT_COLUMN_OPTIONS['사출_방식']?.find(o => o.value === value)?.bg ?? ''
  renderSelectBadge(td, value, bg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function 작업위치Renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = SELECT_COLUMN_OPTIONS['작업_위치']?.find(o => o.value === value)?.bg ?? ''
  renderSelectBadge(td, value, bg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COL_HEADERS: string[] = (COLUMNS as any[]).map((c) => c.title ?? '')

// ── Workday helpers ──────────────────────────────────────────────────────────

// holidaySet은 React state로 관리 (컴포넌트 내부)

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

// Row 기반 재계산 (afterChange / Realtime 용)
function calcShipDateFromRow(row: Pick<Row, '데드라인' | '생산시작일' | '제작_소요일'>, hs: Set<string>): string {
  if (row.데드라인) {
    return nextWorkday(new Date(row.데드라인), hs).toISOString().slice(0, 10)
  }
  if (row.생산시작일 && row.제작_소요일) {
    return addWorkdays(new Date(row.생산시작일), Number(row.제작_소요일), hs).toISOString().slice(0, 10)
  }
  return '-'
}

function calcShipDate(item: Item, hs: Set<string>): string {
  if (item.데드라인) {
    return nextWorkday(new Date(item.데드라인), hs).toISOString().slice(0, 10)
  }
  const 생산시작일 = item.orders?.생산시작일
  const 제작_소요일 = item.products?.제작_소요일
  if (생산시작일 && 제작_소요일) {
    return addWorkdays(new Date(생산시작일), Number(제작_소요일), hs).toISOString().slice(0, 10)
  }
  return '-'
}

function formatDate(val: string | null | undefined): string {
  if (!val) return ''
  return String(val).slice(0, 10)
}

function mapItem(item: Item, hs: Set<string>): Row {
  const o = item.orders
  const 제품명 = item.products?.['제품명'] ?? ''
  const 코드 = item.고유_번호?.length === 15
    ? item.고유_번호.slice(-4)
    : item.고유_번호?.slice(-6) ?? ''
  const pricePerGram = item.metal_prices?.price_per_gram ?? null
  const purity = Number(o?.metals?.purity ?? 0)
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    고유_번호: item.고유_번호 ?? '',
    제품명,
    제품명_코드: 제품명 ? `${제품명}[${코드}]` : '',
    metals: { name: o?.metals?.name ?? '', purity: o?.metals?.purity ?? null },
    발주일: formatDate(o?.발주일),
    생산시작일: formatDate(o?.생산시작일),
    제작_소요일: item.products?.제작_소요일 ?? null,
    데드라인: formatDate(item.데드라인),
    출고예정일: calcShipDate(item, hs),
    시세_g당: pricePerGram != null ? Math.floor(pricePerGram).toLocaleString() : '',
    소재비: (pricePerGram != null && purity > 0)
      ? Math.floor(pricePerGram * purity * 1.1).toLocaleString()
      : '',
    발주_수량: o?.수량 ?? null,
    수량: item.수량 ?? null,
    호수: o?.호수 ?? null,
    고객명: o?.고객명 ?? '',
    디자이너_노트: item.디자이너_노트 ?? '',
    중량: item.중량 ?? null,
    검수: item.검수 ?? false,
    허용_중량_범위: item.products?.기준_중량 != null
      ? `${(item.products.기준_중량 * 0.9).toFixed(2)} ~ ${(item.products.기준_중량 * 1.1).toFixed(2)} g`
      : '',
    중량_검토: (() => {
      const w = item.중량
      const base = item.products?.기준_중량 ?? null
      if (w == null || base == null) return ''
      return (w >= base * 0.9 && w <= base * 1.1) ? '●' : '△'
    })(),
    기타_옵션: o?.기타_옵션 ?? '',
    각인_내용: o?.각인_내용 ?? '',
    각인_폰트: o?.각인_폰트 ?? '',
    기본_공임: item.products?.기본_공임 ?? null,
    공임_조정액: o?.공임_조정액 ?? null,
    확정_공임: o?.확정_공임 ?? null,
    번들_명칭: item.bundles?.번들_고유번호 ?? '',
    원부자재: (item.purchases ?? []).map(p => p.materials?.품목명 || p.이름 || '').join('\n'),
    발주_현황: (() => {
      const purchases = item.purchases ?? []
      if (purchases.length === 0) return ''
      if (purchases.some(p => !p.발주)) return '발주 필요'
      if (purchases.some(p => !p.수령)) return '수령 필요'
      return '수령 완료'
    })(),
    작업_위치: item.작업_위치 ?? '',
    검수_유의: item.products?.검수_유의 ?? '',
    도금_색상: o?.도금_색상 ?? '',
    사출_방식: item.사출_방식 ?? '',
    가다번호: item.products?.product_molds?.[0]?.molds?.가다번호 ?? null,
    가다_위치: item.products?.product_molds?.[0]?.molds?.mold_positions?.보관함_위치 ?? null,
    주물_후_수량: item.주물_후_수량 ?? null,
    포장: item.포장 ?? false,
    순금_중량: (item.중량 != null && purity > 0)
      ? (item.중량 * (purity / 100)).toFixed(3)
      : '',
    rp_출력_시작: item.rp_출력_시작 ?? false,
    왁스_파트_전달: item.왁스_파트_전달 ?? false,
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WorksGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotContainerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)
  const holidaysLoaded = useRef(false)

  // Refs for infinite scroll and stale-closure-safe access in HOT hooks
  const rowsRef = useRef<Row[]>([])
  const totalCountRef = useRef<number | null>(null)
  const isScrollLoadingRef = useRef(false)
  const scrollLoadRef = useRef<(() => void) | null>(null)
  const holidaySetRef = useRef<Set<string>>(new Set())

  const selectMenuRef = useRef<HTMLDivElement>(null)
  const [selectMenu, setSelectMenu] = useState<{ top: number; left: number; row: number; width: number; column: string; options: { value: string; bg: string }[] } | null>(null)

  const summaryInnerRef = useRef<HTMLDivElement>(null)
  const customScrollbarRef = useRef<HTMLDivElement>(null)
  const customScrollbarInnerRef = useRef<HTMLDivElement>(null)
  const scrollFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncingCustomScrollRef = useRef(false)
  const [colWidths, setColWidths] = useState<number[]>((COLUMNS as any[]).map((c: any) => c.width ?? 100)) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[] | null>(null)
  const [fixedCols, setFixedCols] = useState(1)

  const [rows, setRows] = useState<Row[]>([])
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  // Filter input state (not yet submitted)
  const [inputSearch, setInputSearch] = useState('')
  const [inputBrand, setInputBrand] = useState('')
  const [inputDateFrom, setInputDateFrom] = useState('')
  const [inputDateTo, setInputDateTo] = useState('')

  // Filter/Sort modal state
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
  const [sortConditions, setSortConditions] = useState<SortCondition[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const filterConditionsRef = useRef<FilterCondition[]>([])
  const sortConditionsRef = useRef<SortCondition[]>([])

  // Submitted query state (triggers API)
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null)
  const [offset, setOffset] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const isAppend = useRef(false)

  // Sync refs during render (no effect needed — refs don't cause re-renders)
  rowsRef.current = rows
  totalCountRef.current = totalCount
  holidaySetRef.current = holidaySet
  filterConditionsRef.current = filterConditions
  sortConditionsRef.current = sortConditions

  // Stable scroll-load callback (read by HOT afterScrollVertically hook)
  scrollLoadRef.current = () => {
    if (isScrollLoadingRef.current) return
    const tc = totalCountRef.current
    if (tc === null || rowsRef.current.length >= tc) return
    isScrollLoadingRef.current = true
    isAppend.current = true
    setOffset(o => o + 100)
  }

  const handleSearch = () => {
    isAppend.current = false
    setOffset(0)
    setTotalCount(null)
    setSubmittedFilters({
      search: inputSearch.trim(),
      brand: inputBrand.trim(),
      dateFrom: inputDateFrom,
      dateTo: inputDateTo,
    })
    setFetchTrigger(n => n + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSelectOption = (column: string, rowIdx: number, value: string) => {
    const rowData = rowsRef.current[rowIdx]
    if (!rowData?.id) return
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [column]: value } : r))
    void fetch(`/api/order-items/${rowData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column, value, expected_updated_at: rowData.updated_at }),
    })
    setSelectMenu(null)
  }

  useEffect(() => {
    if (!selectMenu) return
    const handler = (e: MouseEvent) => {
      if (!selectMenuRef.current?.contains(e.target as Node)) setSelectMenu(null)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [selectMenu])

  const hasAnyFilter = !!submittedFilters && (
    submittedFilters.search.length > 0 ||
    submittedFilters.brand.length > 0 ||
    submittedFilters.dateFrom.length > 0 ||
    submittedFilters.dateTo.length > 0 ||
    filterConditionsRef.current.length > 0 ||
    sortConditionsRef.current.length > 0
  )

  // Load holidays once on mount
  useEffect(() => {
    if (holidaysLoaded.current) return
    holidaysLoaded.current = true
    fetch('/api/holidays')
      .then(res => res.json())
      .then(({ dates }) => {
        if (Array.isArray(dates)) setHolidaySet(new Set<string>(dates))
      })
  }, [])

  // holidaySet 로드/변경 시 전체 rows 출고예정일 재계산
  useEffect(() => {
    if (holidaySet.size === 0) return
    setRows(prev => {
      if (prev.length === 0) return prev
      return prev.map(row => ({
        ...row,
        출고예정일: calcShipDateFromRow(row, holidaySet),
      }))
    })
  }, [holidaySet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch data on filter/sort/offset change
  useEffect(() => {
    if (!submittedFilters) { setRows([]); setApiError(null); return }

    const anyFilter =
      submittedFilters.search.length > 0 ||
      submittedFilters.brand.length > 0 ||
      submittedFilters.dateFrom.length > 0 ||
      submittedFilters.dateTo.length > 0 ||
      filterConditionsRef.current.length > 0 ||
      sortConditionsRef.current.length > 0
    if (!anyFilter) { setRows([]); setApiError(null); return }

    const shouldAppend = isAppend.current
    isAppend.current = false

    let cancelled = false
    if (shouldAppend) setLoadingMore(true)
    else setLoading(true)
    setApiError(null)

    fetch('/api/order-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: submittedFilters.search || null,
        brand: submittedFilters.brand || null,
        dateFrom: submittedFilters.dateFrom || null,
        dateTo: submittedFilters.dateTo || null,
        offset,
        filters: filterConditionsRef.current,
        sorts: sortConditionsRef.current,
      }),
    })
      .then(res => res.json())
      .then(({ data, error, totalCount: tc }) => {
        if (cancelled) return
        if (error) { setApiError(error); return }
        const mapped = (data ?? []).map((item: Item) => mapItem(item, holidaySetRef.current))
        if (shouldAppend) {
          setRows(prev => [...prev, ...mapped])
        } else {
          setRows(mapped)
          if (tc !== undefined) setTotalCount(Number(tc))
        }
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setLoadingMore(false); isScrollLoadingRef.current = false }
      })

    return () => { cancelled = true }
  }, [submittedFilters, offset, fetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize HOT height to fill its container
  useEffect(() => {
    if (!hotContainerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 0 && hotRef.current) {
          hotRef.current.updateSettings({ height: h })
        }
      }
    })
    ro.observe(hotContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Initialize Handsontable once
  useEffect(() => {
    if (!containerRef.current || hotRef.current) return
    hotRef.current = new Handsontable(containerRef.current, {
      data: [],
      columns: COLUMNS,
      colWidths: COLUMNS.map(c => c.width),
      rowHeaders: false,
      colHeaders: COL_HEADERS,
      readOnly: true,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      height: hotContainerRef.current?.clientHeight || 600,
      wordWrap: false,
      autoColumnSize: false,
      manualColumnResize: true,
      manualColumnMove: true,
      columnHeaderHeight: 33,
      rowHeights: 33,
      fixedColumnsStart: 1,
      outsideClickDeselects: false,
      enterBeginsEditing: true,
      enterMoves: { row: 1, col: 0 },
      tabMoves: { row: 0, col: 1 },
    })

    // Fix horizontal scroll misalignment:
    // ht_master has a vertical scrollbar (~17px) that reduces clientWidth,
    // making its max scrollLeft larger than ht_clone_top's max scrollLeft.
    // Cap master.scrollLeft to top's max to keep them aligned.
    setTimeout(() => {
      if (!hotRef.current) return
      const masterEl = hotRef.current.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
      const topEl = hotRef.current.rootElement?.querySelector('.ht_clone_top .wtHolder') as HTMLElement | null
      if (!masterEl || !topEl) return
      let syncing = false
      masterEl.addEventListener('scroll', () => {
        if (syncing) return
        syncing = true
        const maxScroll = topEl.scrollWidth - topEl.clientWidth
        const capped = Math.min(masterEl.scrollLeft, maxScroll)
        masterEl.scrollLeft = capped
        topEl.scrollLeft = capped
        if (summaryInnerRef.current) {
          summaryInnerRef.current.style.transform = `translateX(-${capped}px)`
        }
        // Sync custom scrollbar position
        if (!syncingCustomScrollRef.current && customScrollbarRef.current) {
          syncingCustomScrollRef.current = true
          customScrollbarRef.current.scrollLeft = capped
          syncingCustomScrollRef.current = false
        }
        // Fade in scrollbar
        if (customScrollbarRef.current) {
          customScrollbarRef.current.style.opacity = '1'
        }
        if (scrollFadeTimerRef.current) clearTimeout(scrollFadeTimerRef.current)
        scrollFadeTimerRef.current = setTimeout(() => {
          if (customScrollbarRef.current) customScrollbarRef.current.style.opacity = '0'
        }, 1000)
        syncing = false
      })
    }, 100)
    // Field type icons via DOM manipulation (avoids HOT HTML escaping)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterGetColHeader', (col: number, TH: HTMLTableCellElement) => {
      TH.style.verticalAlign = 'middle'
      TH.style.lineHeight = 'normal'
      TH.style.paddingTop = '0'
      TH.style.paddingBottom = '0'
      if (col === 0) TH.style.paddingLeft = '12px'
      const divBase = TH.querySelector('.colHeader') as HTMLElement | null
      if (divBase) {
        divBase.style.height = '100%'
        divBase.style.lineHeight = 'normal'
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (COLUMNS as any[])[col]
      if (!colDef || !colDef.fieldType) return
      if (TH.querySelector('.field-type-icon')) return
      const div = TH.querySelector('.colHeader') as HTMLElement | null
      if (!div) return
      const icon = document.createElement('span')
      icon.className = 'field-type-icon'
      icon.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;flex-shrink:0;'
      icon.innerHTML = getFieldTypeIcon(colDef.fieldType as FieldType)
      const textSpan = document.createElement('span')
      textSpan.style.overflow = 'hidden'
      textSpan.style.textOverflow = 'ellipsis'
      textSpan.style.whiteSpace = 'nowrap'
      textSpan.style.minWidth = '0'
      textSpan.textContent = div.textContent ?? ''
      div.textContent = ''
      div.style.display = 'inline-flex'
      div.style.alignItems = 'center'
      div.style.width = '100%'
      div.style.overflow = 'hidden'
      div.appendChild(icon)
      div.appendChild(textSpan)
    })
    // Cell edit → PATCH API
    hotRef.current.addHook('afterChange', (changes, source) => {
      if (source === 'loadData' || !changes) return
      for (const [row, prop, oldVal, newVal] of changes) {
        if (oldVal === newVal) continue
        const rowData = rowsRef.current[row as number]
        if (!rowData?.id) continue
        const supabaseColumn = COLUMN_MAP[prop as string]
        if (!supabaseColumn) continue
        void fetch(`/api/order-items/${rowData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: supabaseColumn, value: newVal, expected_updated_at: rowData.updated_at }),
        })
        // 데드라인 변경 시 출고예정일 즉시 재계산
        if (supabaseColumn === '데드라인') {
          const rowIdx = row as number
          const newDeadline = newVal ? String(newVal).slice(0, 10) : ''
          setRows(prev => prev.map((r, i) => {
            if (i !== rowIdx) return r
            const updated = { ...r, 데드라인: newDeadline }
            return { ...updated, 출고예정일: calcShipDateFromRow(updated, holidaySetRef.current) }
          }))
        }
      }
    })
    // afterBeginEditing: longtext → textarea 확장, date → 캘린더 자동 오픈, 사출_방식 → 드롭다운 전체 표시
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterBeginEditing', (row: number, col: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (COLUMNS as any[])[col]
      if (!colDef) return

      if (colDef.fieldType === 'longtext') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const editor = hotRef.current?.getActiveEditor() as any
        const textarea = editor?.TEXTAREA
        if (textarea) {
          textarea.style.minHeight = '80px'
          textarea.style.whiteSpace = 'pre-wrap'
          textarea.style.resize = 'vertical'
        }
        return
      }

      if (colDef.type === 'date') {
        setTimeout(() => {
          // 버튼 숨기기 + input 너비 확장 (버튼에 고정 class 없어서 DOM 직접 조작)
          document.querySelectorAll('.htDateInput').forEach(el => {
            const btn = el.querySelector('button')
            if (btn) btn.style.display = 'none'
            const input = el.querySelector('input') as HTMLElement | null
            if (input) input.style.width = '100%'
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const editor = hotRef.current?.getActiveEditor() as any
          // editor 객체에 직접 button 참조가 있으면 숨기기
          if (editor?.datePickerButton) {
            editor.datePickerButton.style.display = 'none'
          }
          if (editor?.datePicker) {
            editor.datePicker.show()
          }
        }, 30)
      }

    })
    // select 컬럼: 첫 클릭=선택, 두 번째 클릭=드롭다운 오픈
    // beforeOnCellMouseDown에서 클릭 전 선택 상태를 캡처
    let selectAlreadySelected = false
    hotRef.current.addHook('beforeOnCellMouseDown', (_e: MouseEvent, coords: { row: number; col: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((COLUMNS as any[])[coords.col]?.fieldType !== 'select') {
        selectAlreadySelected = false
        return
      }
      const sel = hotRef.current?.getSelected()
      selectAlreadySelected = sel?.some(([r1, c1, r2, c2]) =>
        coords.row >= Math.min(r1, r2) && coords.row <= Math.max(r1, r2) &&
        coords.col >= Math.min(c1, c2) && coords.col <= Math.max(c1, c2)
      ) ?? false
    })
    hotRef.current.addHook('afterOnCellMouseDown', (_e: MouseEvent, coords: { row: number; col: number }) => {
      if (coords.row < 0) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (COLUMNS as any[])[coords.col]
      if (colDef?.fieldType !== 'select') return
      if (!selectAlreadySelected) return // 첫 클릭: 셀 선택만
      const column = colDef.data as string
      const options = SELECT_COLUMN_OPTIONS[column] ?? []
      const td = hotRef.current?.getCell(coords.row, coords.col) as HTMLElement | null
      if (!td) return
      const rect = td.getBoundingClientRect()
      setSelectMenu({ top: rect.bottom + 4, left: rect.left, row: coords.row, width: Math.max(rect.width, 120), column, options })
    })
    // Column resize → sync summary bar widths
    hotRef.current.addHook('afterColumnResize', (newSize: number, column: number) => {
      setColWidths(prev => {
        const next = [...prev]
        next[column] = newSize
        return next
      })
    })
    // Selection → update selectedRowIndices for summary bar
    hotRef.current.addHook('afterSelectionEnd', (r1: number, _c1: number, r2: number) => {
      if (r1 < 0) { setSelectedRowIndices(null); return }
      const minR = Math.min(r1, r2)
      const maxR = Math.max(r1, r2)
      if (minR === maxR) { setSelectedRowIndices(null); return }
      const indices: number[] = []
      for (let i = minR; i <= maxR; i++) indices.push(i)
      setSelectedRowIndices(indices)
    })
    hotRef.current.addHook('afterDeselect', () => setSelectedRowIndices(null))
    // Infinite scroll — load next page when near bottom (90% threshold)
    hotRef.current.addHook('afterScrollVertically', () => {
      const hot = hotRef.current
      if (!hot) return
      const lastVisible = hot.getLastFullyVisibleRow()
      if (lastVisible === null) return
      const total = hot.countRows()
      if (total > 0 && lastVisible >= Math.floor(total * 0.9)) {
        scrollLoadRef.current?.()
      }
    })
    return () => {
      hotRef.current?.destroy()
      hotRef.current = null
    }
  }, [])

  // Update grid data
  useEffect(() => {
    if (!hotRef.current) return
    hotRef.current.loadData(rows)
    if (rows.length > 0) hotRef.current.refreshDimensions()
  }, [rows])

  // Realtime subscription — sync editable fields from other clients
  useEffect(() => {
    const channel = supabase
      .channel('order_items_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        (payload) => {
          const n = payload.new as Record<string, unknown>
          const updatedId = n.id as string
          setRows(prev => prev.map(row => {
            if (row.id !== updatedId) return row
            const newDeadline = n.데드라인 !== undefined
              ? (n.데드라인 ? String(n.데드라인).slice(0, 10) : '')
              : row.데드라인
            return {
              ...row,
              중량: (n.중량 as number | null) ?? row.중량,
              데드라인: newDeadline,
              출고예정일: calcShipDateFromRow({ ...row, 데드라인: newDeadline }, holidaySetRef.current),
              작업_위치: (n.작업_위치 as string) ?? row.작업_위치,
              검수: (n.검수 as boolean) ?? row.검수,
              포장: (n.포장 as boolean) ?? row.포장,
              rp_출력_시작: (n.rp_출력_시작 as boolean) ?? row.rp_출력_시작,
              왁스_파트_전달: (n.왁스_파트_전달 as boolean) ?? row.왁스_파트_전달,
              주물_후_수량: (n.주물_후_수량 as number | null) ?? row.주물_후_수량,
              디자이너_노트: (n.디자이너_노트 as string) ?? row.디자이너_노트,
              사출_방식: (n.사출_방식 as string) ?? row.사출_방식,
              updated_at: (n.updated_at as string) ?? row.updated_at,
            }
          }))
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (hotRef.current) {
      hotRef.current.updateSettings({ fixedColumnsStart: fixedCols })
    }
  }, [fixedCols])

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar — shrink-0, px-5 only */}
      <div className="flex-shrink-0 flex flex-wrap items-end gap-3 border-b border-[#E2E8F0] bg-white px-5 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">제품명</label>
          <input
            type="text"
            placeholder="제품명 검색"
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-48 h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">브랜드</label>
          <input
            type="text"
            placeholder="브랜드명"
            value={inputBrand}
            onChange={e => setInputBrand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-36 h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">발주일</label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={inputDateFrom}
              onChange={e => setInputDateFrom(e.target.value)}
              className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#111827] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
            />
            <span className="text-[#9CA3AF] text-sm">–</span>
            <input
              type="date"
              value={inputDateTo}
              onChange={e => setInputDateTo(e.target.value)}
              className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#111827] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="self-end h-[28px] rounded-[4px] bg-[#1C1C1C] px-[14px] text-[12px] font-medium text-white hover:bg-[#333] active:bg-[#444] transition-colors"
        >
          검색
        </button>

        {/* Filter / Sort buttons */}
        <button
          onClick={() => { setShowFilterModal(v => !v); setShowSortModal(false) }}
          className="self-end h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5l-4-5z" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          필터
          {filterConditions.length > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{filterConditions.length}</span>
          )}
        </button>
        <button
          onClick={() => { setShowSortModal(v => !v); setShowFilterModal(false) }}
          className="self-end h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M4 7h6M6 10h2" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/></svg>
          정렬
          {sortConditions.length > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{sortConditions.length}</span>
          )}
        </button>

        {/* Freeze column control */}
        <div className="flex items-center gap-1 self-end ml-auto">
          <span className="text-[12px] text-[#6B7280]">고정: {fixedCols}열</span>
          <button
            onClick={() => setFixedCols(n => Math.max(0, n - 1))}
            className="w-[22px] h-[22px] flex items-center justify-center rounded border border-[#E2E8F0] text-[#6B7280] hover:bg-[#F1F5F9] text-[14px] leading-none"
          >−</button>
          <button
            onClick={() => setFixedCols(n => Math.min(COLUMNS.length, n + 1))}
            className="w-[22px] h-[22px] flex items-center justify-center rounded border border-[#E2E8F0] text-[#6B7280] hover:bg-[#F1F5F9] text-[14px] leading-none"
          >+</button>
        </div>

        {/* Count + status */}
        <div className="self-end flex items-center gap-3 text-[12px] text-[#6B7280]">
          {totalCount !== null && !loading && (
            <span>{totalCount.toLocaleString()}건 중 {rows.length.toLocaleString()}건</span>
          )}
          {loading && <span>로딩 중…</span>}
          {apiError && <span className="text-red-500">{apiError}</span>}
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyFilter && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[#9CA3AF]">
          필터를 입력하고 검색하면 결과가 표시됩니다
        </div>
      )}

      {/* Grid area — flex-1, fills remaining height */}
      <div className={`relative flex flex-col flex-1 min-h-0 overflow-hidden${!hasAnyFilter ? ' hidden' : ''}`}>
        {/* HOT container — fills all available space */}
        <div
          ref={hotContainerRef}
          className={`flex-1 min-h-0 overflow-hidden${loading ? ' opacity-50 pointer-events-none' : ''}`}
        >
          <div ref={containerRef} />
        </div>

        {/* Infinite scroll loading indicator */}
        {loadingMore && (
          <div className="flex-shrink-0 flex justify-center items-center py-2 border-t border-[#E5E7EB] bg-white text-[12px] text-[#9CA3AF]">
            로딩 중…
          </div>
        )}

        {/* Custom horizontal scrollbar — overlaps SummaryBar, fades in on scroll */}
        <div
          ref={customScrollbarRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            overflowX: 'scroll',
            overflowY: 'hidden',
            opacity: 0,
            transition: 'opacity 0.4s ease',
            zIndex: 20,
          }}
          onScroll={() => {
            if (syncingCustomScrollRef.current || !customScrollbarRef.current) return
            syncingCustomScrollRef.current = true
            const scrollLeft = customScrollbarRef.current.scrollLeft
            // Sync to HOT
            if (hotRef.current) {
              const masterEl = hotRef.current.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
              const topEl = hotRef.current.rootElement?.querySelector('.ht_clone_top .wtHolder') as HTMLElement | null
              if (masterEl) masterEl.scrollLeft = scrollLeft
              if (topEl) topEl.scrollLeft = scrollLeft
            }
            if (summaryInnerRef.current) {
              summaryInnerRef.current.style.transform = `translateX(-${scrollLeft}px)`
            }
            syncingCustomScrollRef.current = false
          }}
        >
          <div
            ref={customScrollbarInnerRef}
            style={{ height: 1, width: colWidths.reduce((s, w) => s + w, 0) }}
          />
        </div>

        {/* Summary bar */}
        <SummaryBar
          rows={rows as unknown as Record<string, unknown>[]}
          selectedRowIndices={selectedRowIndices}
          columns={(COLUMNS as unknown) as SummaryColDef[]}
          colWidths={colWidths}
          innerRef={summaryInnerRef}
        />
      </div>

      {/* Filter modal */}
      {showFilterModal && (
        <FilterModal
          columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string; fieldType: string } => typeof c.data === 'string' && c.data !== '') as FilterColDef[]}
          conditions={filterConditions}
          onChange={setFilterConditions}
          onApply={handleSearch}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {/* Sort modal */}
      {showSortModal && (
        <SortModal
          columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string } => typeof c.data === 'string' && c.data !== '') as SortColDef[]}
          conditions={sortConditions}
          onChange={setSortConditions}
          onApply={handleSearch}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {/* select 컬럼 커스텀 드롭다운 */}
      {selectMenu && (
        <div
          ref={selectMenuRef}
          style={{ position: 'fixed', top: selectMenu.top, left: selectMenu.left, minWidth: selectMenu.width, zIndex: 9999 }}
          className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 max-h-[320px] overflow-y-auto"
        >
          {selectMenu.options.map(({ value, bg }) => (
            <div
              key={value}
              className="flex items-center px-2 py-[5px] rounded-[4px] cursor-pointer hover:bg-[#F8FAFC]"
              onMouseDown={e => { e.preventDefault(); handleSelectOption(selectMenu.column, selectMenu.row, value) }}
            >
              <span
                style={{ background: bg }}
                className="inline-flex items-center px-2 py-[2px] rounded-[9999px] text-[13px] font-medium text-[#111827] whitespace-nowrap"
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
