'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'
import { supabase } from '@/lib/supabase/client'
import SummaryBar from '@/components/works/SummaryBar'
import type { SummaryColDef } from '@/components/works/SummaryBar'
import FilterModal from '@/components/works/FilterModal'
import type { RootFilterState, FilterColDef } from '@/components/works/FilterModal'
import { countAllConditions } from '@/components/works/FilterModal'
import SortModal from '@/components/works/SortModal'
import type { SortCondition, SortColDef } from '@/components/works/SortModal'
import ImageModal from '@/components/works/ImageModal'
import ColumnManagerDropdown from '@/components/works/ColumnManagerDropdown'
import type { ManagedColumn } from '@/components/works/ColumnManagerDropdown'
import ShortcutsModal from '@/components/works/ShortcutsModal'

// Row height presets. Values are the actual row px height used for both the CSS
// var (--grid-row-h) and HOT's rowHeights option. Keeping them in lockstep is
// critical — divergence is what caused the earlier "fixed No. column drift" bug.
type RowHeight = 'short' | 'medium' | 'tall' | 'extra-tall'
const ROW_HEIGHT_PX: Record<RowHeight, number> = {
  'short': 32,
  'medium': 48,
  'tall': 64,
  'extra-tall': 96,
}
const ROW_HEIGHT_LABEL: Record<RowHeight, string> = {
  'short': 'Short',
  'medium': 'Medium',
  'tall': 'Tall',
  'extra-tall': 'Extra Tall',
}
// Image thumbnail size per row height. Applies to every `fieldType: 'image'`
// column via the shared --grid-thumb-size CSS var (globals.css .image-thumb).
const ROW_THUMB_PX: Record<RowHeight, number> = {
  'short': 24,
  'medium': 36,
  'tall': 52,
  'extra-tall': 80,
}
// Supabase Storage image transform width — chosen ≈ 2× thumb px for retina,
// capped at sensible values to keep payloads small on Short/Medium.
const ROW_THUMB_URL_W: Record<RowHeight, number> = {
  'short': 48,
  'medium': 72,
  'tall': 104,
  'extra-tall': 160,
}

type ImageItem = { url: string; name: string }
type AttachmentItem = { url: string; name: string }

// flat_order_details 테이블 구조 (비정규화된 단일 테이블)
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
  작업_위치: string | null
  사출_방식: string | null
  주물_후_수량: number | null
  rp_출력_시작: boolean | null
  왁스_파트_전달: boolean | null
  order_id: string | null
  product_id: string | null
  brand_id: string | null
  metal_price_id: string | null
  bundle_id: string | null
  // orders 유래
  소재: string | null
  도금_색상: string | null
  각인_여부: boolean | null
  각인_내용: string | null
  각인_폰트: string | null
  기타_옵션: string | null
  스톤_수동: string | null
  호수: string | null
  고객명: string | null
  발주일: string | null
  생산시작일: string | null
  회차: number | null
  확정_공임: number | null
  공임_조정액: number | null
  // products 유래
  제품명: string | null
  제작_소요일: number | null
  기본_공임: number | null
  // brands/metals 유래
  brand_name: string | null
  metal_name: string | null
  metal_purity: number | null
  images: ImageItem[]
  reference_files: AttachmentItem[]
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
  images: ImageItem[]
  reference_files: AttachmentItem[]
}

// Debounce delay for server-side search
const SEARCH_DEBOUNCE_MS = 500


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

// Select column option values for FilterModal
const FILTER_SELECT_OPTIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SELECT_COLUMN_OPTIONS).map(([k, v]) => [k, v.map(o => o.value)])
)

// 편집 가능 컬럼 → order_items 필드명 매핑
const EDITABLE_FIELD_MAP: Record<string, string> = {
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

// ── Attachment upload/delete helpers ──────────────────────────────────────────
let onAttachmentUpload: ((rowIdx: number, files: FileList) => void) | null = null
let onAttachmentDelete: ((rowIdx: number, fileIdx: number) => void) | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attachmentRenderer(_hot: any, td: HTMLTableCellElement, row: number, _col: number, _prop: any, value: any) {
  const items: AttachmentItem[] = Array.isArray(value) ? value.filter((v: any) => v?.url) : [] // eslint-disable-line @typescript-eslint/no-explicit-any
  // Sig-cache: click handlers close over `row` and the `fileIdx` of each chip,
  // so the sig must include row plus url+name of every item. Skipping rebuild
  // when content is identical cuts scroll-time DOM churn for rows with files.
  const sig = `${row}|${row === 0 ? 1 : 0}|${items.map(i => `${i.url}\u0001${i.name}`).join('\u0002')}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  if (anyTd.__attSig === sig) return
  anyTd.__attSig = sig

  td.innerHTML = ''
  td.style.padding = '0'

  const wrapper = document.createElement('div')
  wrapper.className = 'attachment-popout-wrapper'
  if (row === 0) wrapper.classList.add('is-first-row')

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'attachment-empty'
    const clipIcon = document.createElement('span')
    clipIcon.style.fontSize = '13px'
    clipIcon.textContent = '\u{1F4CE}'
    const label = document.createElement('span')
    label.style.cssText = 'font-size:11px;color:#9CA3AF;'
    label.textContent = '파일 추가'
    empty.appendChild(clipIcon)
    empty.appendChild(label)
    empty.onclick = (e) => {
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = () => { if (input.files?.length) onAttachmentUpload?.(row, input.files) }
      input.click()
    }
    wrapper.appendChild(empty)
  } else {
    items.forEach((item, i) => {
      const chip = document.createElement('a')
      chip.className = 'attachment-chip'
      chip.href = item.url
      chip.target = '_blank'
      chip.rel = 'noopener noreferrer'
      chip.title = item.name
      chip.onclick = (e) => e.stopPropagation()
      const clipSpan = document.createElement('span')
      clipSpan.style.fontSize = '11px'
      clipSpan.textContent = '\u{1F4CE}'
      chip.appendChild(clipSpan)
      const nameEl = document.createElement('span')
      nameEl.className = 'attachment-name'
      nameEl.textContent = item.name
      chip.appendChild(nameEl)
      // Delete button
      const delBtn = document.createElement('span')
      delBtn.className = 'attachment-del'
      delBtn.textContent = '\u00D7'
      delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onAttachmentDelete?.(row, i) }
      chip.appendChild(delBtn)
      wrapper.appendChild(chip)
    })
    const addBtn = document.createElement('div')
    addBtn.className = 'attachment-add-btn'
    addBtn.textContent = '+'
    addBtn.onclick = (e) => {
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = () => { if (input.files?.length) onAttachmentUpload?.(row, input.files) }
      input.click()
    }
    wrapper.appendChild(addBtn)
  }

  td.ondragover = (e) => { e.preventDefault(); wrapper.classList.add('drag-over') }
  td.ondragleave = () => { wrapper.classList.remove('drag-over') }
  td.ondrop = (e) => {
    e.preventDefault()
    wrapper.classList.remove('drag-over')
    if (e.dataTransfer?.files?.length) onAttachmentUpload?.(row, e.dataTransfer.files)
  }

  td.appendChild(wrapper)
}

// ── Image gallery callback (set by WorksGrid component) ──────────────────────
let onImageGallery: ((images: ImageItem[], startIdx: number) => void) | null = null
// Current Supabase ?width= param used by imageRenderer. Updated from the
// rowHeight effect so thumbnails fetch at an appropriate resolution per size.
// Defaults to the Short-row value so initial renders (before first effect
// flush) already get a sensible size.
let imageThumbUrlWidth: number = 48
let checkedRowsRefGlobal: React.MutableRefObject<Set<string>> | null = null
let lastCheckedRowRefGlobal: React.MutableRefObject<number | null> | null = null
let setSelectedRowIdsGlobal: React.Dispatch<React.SetStateAction<Set<string>>> | null = null
let hotRefGlobal: React.MutableRefObject<Handsontable | null> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function imageRenderer(_hot: any, td: HTMLTableCellElement, row: number, _col: number, _prop: any, value: any) {
  const imgs: ImageItem[] = Array.isArray(value) ? value.filter((v: any) => v?.url) : [] // eslint-disable-line @typescript-eslint/no-explicit-any
  // Sig-cache: skip rebuild if same urls + same first-row flag + same thumb width.
  // Rebuilding creates fresh <img> elements which forces the browser to re-decode
  // — visibly stutters vertical scroll. row index matters only for the
  // is-first-row class (row 0 pops down instead of up).
  const sig = `${row === 0 ? 1 : 0}|${imageThumbUrlWidth}|${imgs.map(i => i.url).join('\u0001')}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  if (anyTd.__imgSig === sig) return
  anyTd.__imgSig = sig

  td.innerHTML = ''
  td.classList.add('htDimmed')
  td.style.padding = '0'

  if (imgs.length === 0) return

  const wrapper = document.createElement('div')
  wrapper.className = 'image-popout-wrapper'
  if (row === 0) wrapper.classList.add('is-first-row')

  imgs.forEach((item, i) => {
    const img = document.createElement('img')
    img.className = 'image-thumb'
    img.src = item.url.includes('supabase.co/storage')
      ? item.url + `?width=${imageThumbUrlWidth}&quality=70`
      : item.url
    img.onclick = (e) => {
      if (!td.classList.contains('current')) return
      e.stopPropagation()
      onImageGallery?.(imgs, i)
    }
    wrapper.appendChild(img)
  })

  td.appendChild(wrapper)
}

const COLUMNS = [
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (_row: any) => '',
    title: '',
    width: 50,
    readOnly: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: function (_hot: any, td: HTMLTableCellElement, row: number) {
      // Get row data to determine checked state. getSourceDataAtRow is O(1) —
      // avoid getSourceData()[row] which would force the full array.
      const rowData = (_hot as any).getSourceDataAtRow?.(row) as Row | undefined
      const rowId = rowData?.id
      const isChecked = rowId && checkedRowsRefGlobal?.current.has(rowId)

      // Sig-cache: the click handler closes over `row` and `rowId`, so invalidate
      // when either changes. Skips ~20 wrapper+checkbox+span DOM rebuilds per
      // scroll tick for the No. column alone.
      const sig = `${row}|${rowId ?? ''}|${isChecked ? '1' : '0'}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyTd = td as any
      if (anyTd.__noSig === sig) return
      anyTd.__noSig = sig

      td.innerHTML = ''
      td.style.backgroundColor = '#F8FAFC'
      td.style.borderRight = '1px solid #E2E8F0'
      td.style.padding = '0'
      // No hardcoded height — global CSS (.handsontable td) drives height via --grid-row-h.
      // Setting explicit height here was the root cause of the "fixed No. column drift" bug.
      td.style.overflow = 'hidden'

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:4px;width:100%;height:100%;'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'row-select-checkbox'
      checkbox.checked = !!isChecked
      checkbox.style.cssText = 'width:13px;height:13px;margin:0;padding:0;cursor:pointer;flex-shrink:0;'
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation()
        if (!rowId) return

        // 단일 선택/해제만 처리 (shift+클릭은 beforeOnCellMouseDown에서 처리)
        if (checkbox.checked) {
          checkedRowsRefGlobal?.current.add(rowId)
        } else {
          checkedRowsRefGlobal?.current.delete(rowId)
          // 체크 해제 시 즉시 DOM 업데이트
          checkbox.checked = false
        }

        // lastChecked 업데이트
        if (lastCheckedRowRefGlobal) {
          lastCheckedRowRefGlobal.current = row
        }

        // selectedRowIds state 동기화
        if (checkedRowsRefGlobal && setSelectedRowIdsGlobal) {
          setSelectedRowIdsGlobal(new Set(checkedRowsRefGlobal.current))
        }
      })

      const num = document.createElement('span')
      num.textContent = String(row + 1)
      num.style.cssText = 'font-size:11px;color:#94A3B8;flex-shrink:0;'

      wrapper.appendChild(checkbox)
      wrapper.appendChild(num)
      td.appendChild(wrapper)
    },
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

// ── Field type icons ─────────────────────────────────────────────────────────

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'checkbox' | 'select' | 'formula' | 'image' | 'attachment'

function getFieldTypeIcon(type: FieldType): string {
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

// ── Common select badge renderer ──────────────────────────────────────────────

function renderSelectBadge(td: HTMLTableCellElement, value: string, bg: string, editable = false) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  td.style.position = 'relative'
  if (editable) {
    td.dataset.selectCol = 'true'
  } else {
    delete td.dataset.selectCol
  }
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
  td.classList.add('htDimmed')
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
  // Skip DOM rebuild if the recycled td already shows the same checked state
  // for the same (row,col). HOT reuses td elements across rows during vertical
  // scroll; the click handler closes over row/col, so the sig must invalidate
  // whenever row changes.
  const checked = value === true
  const sig = `${row}|${col}|${checked ? '1' : '0'}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  if (anyTd.__cbSig === sig) return
  anyTd.__cbSig = sig

  td.innerHTML = ''
  // CRITICAL: assign (not `+=`) — the `+=` operator grew the style attribute
  // unboundedly on every scroll-triggered re-render, which thrashed style recalc
  // after a few seconds of scrolling.
  td.style.cssText = 'padding:0;overflow:hidden;cursor:default;'
  td.style.textAlign = 'center'
  td.style.verticalAlign = 'middle'
  td.style.lineHeight = '0'

  td.onmouseenter = null
  td.onmouseleave = null
  td.onclick = null

  // Outer container: fills the td completely, flex-centers the hit target.
  // height:100% tracks --grid-row-h so the checkbox stays centered at any row height.
  const outer = document.createElement('div')
  outer.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;'

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
  renderSelectBadge(td, value, bg, true)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function 작업위치Renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = SELECT_COLUMN_OPTIONS['작업_위치']?.find(o => o.value === value)?.bg ?? ''
  renderSelectBadge(td, value, bg, true)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COL_HEADERS: string[] = (COLUMNS as any[]).map((c) => c.title ?? '')

// Prop → column index cache. COLUMNS is static, so this never needs to update.
// HOT의 propToCol()이 편집 hot path(afterChange, undo/redo replay)에서
// 반복 호출되며 매번 문자열 탐색을 하기 때문에 Map으로 대체.
const PROP_TO_COL: Record<string, number> = (() => {
  const m: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(COLUMNS as any[]).forEach((c, i) => {
    if (typeof c.data === 'string' && c.data) m[c.data] = i
  })
  return m
})()

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
  if (item.생산시작일 && item.제작_소요일) {
    return addWorkdays(new Date(item.생산시작일), Number(item.제작_소요일), hs).toISOString().slice(0, 10)
  }
  return '-'
}

function formatDate(val: string | null | undefined): string {
  if (!val) return ''
  return String(val).slice(0, 10)
}

function mapItem(item: Item, hs: Set<string>): Row {
  const 제품명 = item.제품명 ?? ''
  const 코드 = item.고유_번호?.length === 15
    ? item.고유_번호.slice(-4)
    : item.고유_번호?.slice(-6) ?? ''
  const purity = Number(item.metal_purity ?? 0)
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    고유_번호: item.고유_번호 ?? '',
    제품명,
    제품명_코드: 제품명 ? `${제품명}[${코드}]` : '',
    metals: { name: item.metal_name ?? '', purity: item.metal_purity != null ? String(item.metal_purity) : null },
    발주일: formatDate(item.발주일),
    생산시작일: formatDate(item.생산시작일),
    제작_소요일: item.제작_소요일 ?? null,
    데드라인: formatDate(item.데드라인),
    출고예정일: calcShipDate(item, hs),
    시세_g당: '',
    소재비: '',
    발주_수량: item.수량 ?? null,
    수량: item.수량 ?? null,
    호수: item.호수 ?? null,
    고객명: item.고객명 ?? '',
    디자이너_노트: item.디자이너_노트 ?? '',
    중량: item.중량 ?? null,
    검수: item.검수 ?? false,
    허용_중량_범위: '',
    중량_검토: '',
    기타_옵션: item.기타_옵션 ?? '',
    각인_내용: item.각인_내용 ?? '',
    각인_폰트: item.각인_폰트 ?? '',
    기본_공임: item.기본_공임 ?? null,
    공임_조정액: item.공임_조정액 ?? null,
    확정_공임: item.확정_공임 ?? null,
    번들_명칭: '',
    원부자재: '',
    발주_현황: '',
    작업_위치: item.작업_위치 ?? '',
    검수_유의: '',
    도금_색상: item.도금_색상 ?? '',
    사출_방식: item.사출_방식 ?? '',
    가다번호: null,
    가다_위치: null,
    주물_후_수량: item.주물_후_수량 ?? null,
    포장: item.포장 ?? false,
    순금_중량: (item.중량 != null && purity > 0)
      ? (item.중량 * (purity / 100)).toFixed(3)
      : '',
    rp_출력_시작: item.rp_출력_시작 ?? false,
    왁스_파트_전달: item.왁스_파트_전달 ?? false,
    images: item.images ?? [],
    reference_files: item.reference_files ?? [],
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
  const hasMoreRef = useRef(true)
  const isScrollLoadingRef = useRef(false)
  const scrollLoadRef = useRef<(() => void) | null>(null)
  const holidaySetRef = useRef<Set<string>>(new Set())
  const checkedRowsRef = useRef<Set<string>>(new Set())
  const lastCheckedRowRef = useRef<number | null>(null)

  // Custom undo/redo stacks (HOT native undo resets whenever loadData() runs).
  // Each entry is a batch — all cell changes from a single afterChange invocation
  // (e.g. multi-cell Delete) collapse into one undo step. Items are keyed by rowId
  // so replay survives sort/infinite-scroll row reordering.
  const undoStackRef = useRef<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>([])
  const redoStackRef = useRef<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>([])
  const UNDO_LIMIT = 20

  // Set to true by cell-edit flows to skip the full `hot.loadData()` reload on the
  // following `setRows` — HOT's internal data is already up to date via setDataAtCell,
  // so we avoid the O(visible_rows × columns) re-render. Structural changes
  // (initial load, infinite-scroll, filter/sort, soft delete, realtime) leave this
  // false so loadData still runs.
  const skipNextLoadRef = useRef(false)

  const selectMenuRef = useRef<HTMLDivElement>(null)
  const [selectMenu, setSelectMenu] = useState<{ top: number; left: number; row: number; width: number; column: string; options: { value: string; bg: string }[] } | null>(null)

  const summaryInnerRef = useRef<HTMLDivElement>(null)
  const customScrollbarRef = useRef<HTMLDivElement>(null)
  const customScrollbarInnerRef = useRef<HTMLDivElement>(null)
  const scrollFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncingCustomScrollRef = useRef(false)
  const [colWidths, setColWidths] = useState<number[]>((COLUMNS as any[]).map((c: any) => c.width ?? 100)) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[] | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [galleryImages, setGalleryImages] = useState<ImageItem[] | null>(null)
  const [galleryStartIdx, setGalleryStartIdx] = useState(0)

  // Register module-level globals used by HOT cell renderers (they can't access React closures).
  // On unmount, null them out so stale references from a previous mount don't leak
  // into a subsequent one (StrictMode, route re-entry).
  useEffect(() => {
    onImageGallery = (imgs, startIdx) => { setGalleryImages(imgs); setGalleryStartIdx(startIdx) }
    checkedRowsRefGlobal = checkedRowsRef
    lastCheckedRowRefGlobal = lastCheckedRowRef
    setSelectedRowIdsGlobal = setSelectedRowIds
    hotRefGlobal = hotRef
    return () => {
      onImageGallery = null
      onAttachmentUpload = null
      onAttachmentDelete = null
      checkedRowsRefGlobal = null
      lastCheckedRowRefGlobal = null
      setSelectedRowIdsGlobal = null
      hotRefGlobal = null
    }
  }, [])

  const [rows, setRows] = useState<Row[]>([])
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; undoAction?: () => void } | null>(null)
  // 토스트 auto-dismiss 타이머. 새 토스트가 뜨면 이전 타이머를 cancel하여
  // 다중 토스트가 서로의 dismiss 타이밍에 간섭하지 않도록 한다. Unmount 시 cleanup.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((t: { message: string; type: 'success' | 'error'; undoAction?: () => void } | null, autoDismissMs?: number) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(t)
    if (t && autoDismissMs != null) {
      toastTimerRef.current = setTimeout(() => {
        setToast(null)
        toastTimerRef.current = null
      }, autoDismissMs)
    }
  }, [])
  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  // Register attachment upload/delete handlers on the module-level globals.
  // Previously these were assigned in the render body, creating new closures on every
  // render. The handlers only read stable refs/callbacks, so a single mount-time
  // assignment is equivalent and avoids per-render allocation.
  useEffect(() => {
    onAttachmentUpload = async (rowIdx, files) => {
      const rowData = rowsRef.current[rowIdx]
      if (!rowData?.id) return
      const existing = rowData.reference_files ?? []
      const uploaded: AttachmentItem[] = []
      const failed: string[] = []
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        form.append('order_item_id', rowData.id)
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: form })
          if (!res.ok) {
            const raw = await res.text()
            let errBody = raw.slice(0, 500)
            try {
              const j = JSON.parse(raw) as { error?: string }
              if (j.error) errBody = j.error.slice(0, 500)
            } catch { /* keep raw */ }
            if (res.status === 413) failed.push(`${file.name} (최대 4.5MB)`)
            else {
              const hint = errBody.length > 80 ? `${errBody.slice(0, 80)}…` : errBody
              failed.push(hint ? `${file.name} (${res.status}: ${hint})` : `${file.name} (HTTP ${res.status})`)
            }
            continue
          }
          const item = await res.json()
          uploaded.push({ url: item.url, name: item.name })
        } catch { failed.push(file.name) }
      }
      if (failed.length > 0) {
        showToast({ message: `${failed.length}개 파일 업로드 실패: ${failed.join(', ')}`, type: 'error' }, 3000)
      }
      if (uploaded.length === 0) return
      const newFiles = [...existing, ...uploaded]
      const previousRows = rowsRef.current
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, reference_files: newFiles } : r))
      const res = await fetch(`/api/order-items/${rowData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'reference_files', value: newFiles }),
      })
      if (!res.ok) {
        setRows(previousRows)
        showToast({ message: '파일 저장에 실패했습니다', type: 'error' }, 2000)
      }
    }

    onAttachmentDelete = async (rowIdx, fileIdx) => {
      const rowData = rowsRef.current[rowIdx]
      if (!rowData?.id) return
      const existing = rowData.reference_files ?? []
      const newFiles = existing.filter((_, i) => i !== fileIdx)
      const previousRows = rowsRef.current
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, reference_files: newFiles } : r))
      const res = await fetch(`/api/order-items/${rowData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'reference_files', value: newFiles }),
      })
      if (!res.ok) {
        setRows(previousRows)
        showToast({ message: '파일 삭제에 실패했습니다', type: 'error' }, 2000)
      }
    }
  }, [showToast])

  const [filterCount, setFilterCount] = useState<number | null>(null)
  const [searchCount, setSearchCount] = useState<number | null>(null)

  // Server-side search with debounce
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTermRef = useRef('')

  // Filter/Sort modal state
  const [filterState, setFilterState] = useState<RootFilterState>({ logic: 'AND', conditions: [] })
  const [sortConditions, setSortConditions] = useState<SortCondition[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)

  // Grid personalization state (Phase 1: in-memory only; Phase 2 will persist).
  const [rowHeight, setRowHeight] = useState<RowHeight>('short')
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  // Number of leftmost visual columns currently frozen. We drive
  // HOT's `fixedColumnsStart` option ourselves (Airtable-style "freeze up to
  // here" — always freezes columns 1..N). Tracked via state so handleResetView
  // and future Phase 2 persistence can read/write a single value.
  const [frozenCount, setFrozenCount] = useState(0)
  // Mirror of frozenCount for the contextMenu callbacks, which close over
  // stale values at HOT-init time. Updated on every state change below.
  const frozenCountRef = useRef(0)
  // Bumped whenever HOT's visual column order changes (header drag, modal
  // drag reorder, or programmatic manualColumnMove). Used as a useMemo dep
  // so `managedColumns` reflects the current visual order in the dropdown.
  const [columnOrderVersion, setColumnOrderVersion] = useState(0)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showRowHeightMenu, setShowRowHeightMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const columnManagerRef = useRef<HTMLDivElement>(null)
  const rowHeightMenuRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  // Mirror of rowHeight in px for the modifyRowHeight HOT hook.
  // The hook closure at init time would otherwise capture the initial value forever;
  // reading from a ref keeps HOT's internal row-height computation in sync with state.
  const rowHeightPxRef = useRef<number>(ROW_HEIGHT_PX.short)
  const filterStateRef = useRef<RootFilterState>({ logic: 'AND', conditions: [] })
  const sortConditionsRef = useRef<SortCondition[]>([])

  // Data load trigger (incremented by handleLoad)
  const [offset, setOffset] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const isAppend = useRef(false)
  const dataLoaded = useRef(false) // true after first successful load

  // Sync refs after render commits. Writing refs in the render body violates React's
  // "no side-effects during render" guidance (StrictMode double-invocation, concurrent
  // rendering) even if it happens to work today. All consumers of these refs run in
  // async HOT hooks / scroll callbacks that fire after commit, so the effect-based
  // sync is functionally equivalent and future-proof.
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { holidaySetRef.current = holidaySet }, [holidaySet])
  useEffect(() => { filterStateRef.current = filterState }, [filterState])
  useEffect(() => { sortConditionsRef.current = sortConditions }, [sortConditions])
  useEffect(() => { searchTermRef.current = searchTerm }, [searchTerm])

  // Stable scroll-load callback (read by HOT afterScrollVertically hook).
  // Assigned in an effect so it's refreshed after commit, not during render.
  useEffect(() => {
    scrollLoadRef.current = () => {
      if (isScrollLoadingRef.current) return
      if (!hasMoreRef.current) return
      isScrollLoadingRef.current = true
      isAppend.current = true
      setOffset(o => o + 100)
    }
  }, [])

  const handleLoad = () => {
    isAppend.current = false
    setOffset(0)
    hasMoreRef.current = true
    setFilterCount(null)
    setSearchCount(null)
    setFetchTrigger(n => n + 1)
  }

  // Debounced search input → triggers server reload
  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchTerm(value.trim())
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  // searchTerm change → reload data from server
  useEffect(() => {
    if (fetchTrigger === 0 && !searchTerm) return // skip if never loaded and no search
    isAppend.current = false
    setOffset(0)
    hasMoreRef.current = true
    setFilterCount(null)
    setSearchCount(null)
    setFetchTrigger(n => n + 1)
  }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectOption = (column: string, rowIdx: number, value: string) => {
    const hot = hotRef.current
    if (!hot) return
    const col = PROP_TO_COL[column] ?? -1
    if (col < 0) return
    // Route through setDataAtCell so afterChange handles PATCH, local state, and undo-stack tracking.
    hot.setDataAtCell(rowIdx, col, value)
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

  const hasData = dataLoaded.current && rows.length > 0

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

  // Fetch data on filter/sort change (triggered by handleLoad via fetchTrigger)
  useEffect(() => {
    if (fetchTrigger === 0) return // skip initial mount

    const shouldAppend = isAppend.current
    isAppend.current = false

    let cancelled = false
    if (shouldAppend) setLoadingMore(true)
    else setLoading(true)
    setApiError(null)

    const apiFilters = filterStateRef.current
    const apiSorts = sortConditionsRef.current.map(({ column, direction }) => ({ column, direction }))

    fetch('/api/order-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset,
        filters: apiFilters,
        sorts: apiSorts,
        search_term: searchTermRef.current || null,
      }),
    })
      .then(res => res.json())
      .then(({ data, error, filterCount: fc, searchCount: sc }) => {
        if (cancelled) return
        if (error) { setApiError(error); return }
        const items = data ?? []
        const mapped = items.map((item: Item) => mapItem(item, holidaySetRef.current))
        if (items.length < 100) hasMoreRef.current = false
        if (shouldAppend) {
          setRows(prev => [...prev, ...mapped])
        } else {
          setRows(mapped)
          if (fc != null) setFilterCount(Number(fc))
          if (sc != null) setSearchCount(Number(sc))
          else setSearchCount(null)
        }
        dataLoaded.current = true
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setLoadingMore(false); isScrollLoadingRef.current = false }
      })

    return () => { cancelled = true }
  }, [offset, fetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

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
      autoRowSize: false,
      autoColumnSize: false,
      manualColumnResize: true,
      manualColumnMove: true,
      // manualColumnFreeze plugin intentionally disabled — it freezes a single
      // column by moving it to the front, which fights our "freeze from first
      // to selected column" (Airtable/Excel) UX. We drive fixedColumnsStart
      // directly via updateSettings in response to contextMenu actions.
      // HiddenColumns plugin — driven via updateSettings in the effect below.
      // indicators:false keeps the header visually stable; our own "컬럼 관리" dropdown is the UX.
      hiddenColumns: { columns: [], indicators: false },
      columnHeaderHeight: 33,
      rowHeights: ROW_HEIGHT_PX[rowHeight],
      fixedColumnsStart: 0,
      outsideClickDeselects: (target: HTMLElement) => {
        if (selectMenuRef.current?.contains(target)) return false
        if (customScrollbarRef.current?.contains(target)) return false
        return true
      },
      enterBeginsEditing: true,
      enterMoves: { row: 1, col: 0 },
      tabMoves: { row: 0, col: 1 },
      // Custom context menu: Airtable-style freeze semantics.
      // - "여기까지 고정": set fixedColumnsStart = clickedVisualCol + 1
      //   (freezes columns 1..N, where N is the clicked column, 1-indexed).
      // - "고정 해제": clear all frozen columns.
      // Callbacks use frozenCountRef to avoid stale closures from init-time.
      contextMenu: {
        items: {
          'freeze_up_to_here': {
            name() { return '여기까지 고정' },
            disabled() {
              const hot = hotRef.current
              if (!hot) return true
              const sel = hot.getSelectedLast()
              if (!sel) return true
              const col = sel[1]
              if (typeof col !== 'number' || col < 0) return true
              // Already the last frozen column — freezing again is a no-op.
              return col + 1 === frozenCountRef.current
            },
            callback: (_key: string, selection: Array<{ start: { col: number } }>) => {
              const col = selection?.[0]?.start?.col
              if (typeof col !== 'number' || col < 0) return
              const hot = hotRef.current
              if (!hot) return
              const n = col + 1
              hot.updateSettings({ fixedColumnsStart: n })
              setFrozenCount(n)
            },
          },
          'unfreeze_all': {
            name() { return '고정 해제' },
            disabled() { return frozenCountRef.current === 0 },
            callback: () => {
              const hot = hotRef.current
              if (!hot) return
              hot.updateSettings({ fixedColumnsStart: 0 })
              setFrozenCount(0)
            },
          },
        },
      },
      // Disable HOT native UndoRedo plugin — we implement a custom stack that
      // survives loadData resets and syncs DB. With the skipNextLoadRef
      // optimization HOT's internal stack is no longer reset per edit, so its
      // Cmd+Z handler would otherwise race with our window listener and move
      // the cell selection.
      undo: false,
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
      // The 'scroll' event fires for BOTH axes on masterEl (it has a vertical
      // AND horizontal scrollbar). Track lastCapped so we can early-return on
      // vertical-only scrolls — otherwise every vertical tick triggers three
      // scrollLeft writes, a classList toggle, a transform write, and a timer
      // reset, which thrashes layout and makes vertical scrolling stutter.
      let lastCapped = -1
      let lastShadowOn: boolean | null = null
      masterEl.addEventListener('scroll', () => {
        if (syncing) return
        const maxScroll = topEl.scrollWidth - topEl.clientWidth
        const capped = Math.min(masterEl.scrollLeft, maxScroll)
        if (capped === lastCapped) return // vertical-only scroll — nothing to sync
        syncing = true
        lastCapped = capped
        // Only write scrollLeft when it actually changed (writing the same
        // value still costs a style recalc on some browsers).
        if (masterEl.scrollLeft !== capped) masterEl.scrollLeft = capped
        if (topEl.scrollLeft !== capped) topEl.scrollLeft = capped
        // Toggle class driving the frozen-columns right-edge shadow so it
        // only appears while horizontally scrolled. Only call when state flips.
        const shadowOn = capped > 0
        if (shadowOn !== lastShadowOn) {
          const rootEl = hotRef.current?.rootElement as HTMLElement | undefined
          if (rootEl) rootEl.classList.toggle('is-scrolled-x', shadowOn)
          lastShadowOn = shadowOn
        }
        if (summaryInnerRef.current) {
          summaryInnerRef.current.style.transform = `translateX(-${capped}px)`
        }
        // Sync custom scrollbar position
        if (!syncingCustomScrollRef.current && customScrollbarRef.current
            && customScrollbarRef.current.scrollLeft !== capped) {
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
      }, { passive: true })
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
    // Checkbox paste fix: convert string "true"/"false" to boolean
    hotRef.current.addHook('beforeChange', (changes: (Handsontable.CellChange | null)[]) => {
      for (const change of changes) {
        if (!change) continue
        const [, prop, , newVal] = change
        if (typeof newVal !== 'string') continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colDef = (COLUMNS as any[]).find(c => c.data === prop)
        if (colDef?.fieldType !== 'checkbox') continue
        const v = newVal.trim().toLowerCase()
        if (['true', '1', 'yes'].includes(v)) change[3] = true
        else if (['false', '0', 'no'].includes(v)) change[3] = false
      }
    })
    // Cell edit → PATCH API + local state sync (shared path for user edits and undo/redo)
    hotRef.current.addHook('afterChange', (changes, source) => {
      if (source === 'loadData' || (source as string) === 'rollback' || !changes) return

      const isUndoRedo = (source as string) === 'undo' || (source as string) === 'redo'
      // Collect all applicable changes from this single afterChange call into one
      // batch entry so multi-cell edits (e.g. drag-select + Delete) undo together.
      const batchItems: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> = []

      // Coalesce per-row updates so multi-cell edits trigger a single setRows + single
      // React re-render instead of one per changed cell.
      const rowUpdates = new Map<number, Record<string, unknown>>()
      const addUpdate = (idx: number, patch: Record<string, unknown>) => {
        const existing = rowUpdates.get(idx)
        rowUpdates.set(idx, existing ? { ...existing, ...patch } : patch)
      }

      for (const [row, prop, oldVal, newVal] of changes) {
        if (oldVal === newVal) continue
        const rowIdx = row as number
        const rowData = rowsRef.current[rowIdx]
        if (!rowData?.id) continue
        if (prop === 'reference_files') continue
        const field = EDITABLE_FIELD_MAP[prop as string]
        if (!field) continue

        if (!isUndoRedo) {
          batchItems.push({ rowId: rowData.id, prop: prop as string, oldVal, newVal })
        }

        // Optimistic local state update. HOT already has the change via setDataAtCell,
        // so skipNextLoadRef avoids the full loadData on the resulting rows effect.
        if (field === '데드라인') {
          const newDeadline = newVal ? String(newVal).slice(0, 10) : ''
          const current = rowsRef.current[rowIdx]
          const newShipDate = calcShipDateFromRow({ ...current, 데드라인: newDeadline }, holidaySetRef.current)
          // Propagate derived 출고예정일 to HOT directly (readonly formula column).
          const shipCol = PROP_TO_COL['출고예정일'] ?? -1
          if (shipCol >= 0) {
            hotRef.current?.setDataAtCell(rowIdx, shipCol, newShipDate, 'derived')
          }
          addUpdate(rowIdx, { 데드라인: newDeadline, 출고예정일: newShipDate })
        } else {
          addUpdate(rowIdx, { [prop as string]: newVal })
        }

        // Date columns: Postgres rejects '' — normalize empty/whitespace to null.
        const patchValue = field === '데드라인' && (newVal === '' || newVal == null || (typeof newVal === 'string' && newVal.trim() === ''))
          ? null
          : newVal

        // PATCH → rollback on failure
        void (async () => {
          const res = await fetch(`/api/order-items/${rowData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value: patchValue }),
          })
          if (!res.ok) {
            // Rollback HOT cell
            const rollbackCol = PROP_TO_COL[prop as string] ?? -1
            if (rollbackCol >= 0) {
              hotRef.current?.setDataAtCell(rowIdx, rollbackCol, oldVal, 'rollback')
            }
            // Rollback rows state (HOT already reverted via setDataAtCell — skip full reload)
            if (field === '데드라인') {
              const oldDeadline = oldVal ? String(oldVal).slice(0, 10) : ''
              const current = rowsRef.current[rowIdx]
              const oldShipDate = calcShipDateFromRow({ ...current, 데드라인: oldDeadline }, holidaySetRef.current)
              const shipCol = PROP_TO_COL['출고예정일'] ?? -1
              if (shipCol >= 0) {
                hotRef.current?.setDataAtCell(rowIdx, shipCol, oldShipDate, 'derived')
              }
              skipNextLoadRef.current = true
              setRows(prev => prev.map((r, i) =>
                i === rowIdx ? { ...r, 데드라인: oldDeadline, 출고예정일: oldShipDate } : r
              ))
            } else {
              skipNextLoadRef.current = true
              setRows(prev => prev.map((r, i) =>
                i === rowIdx ? { ...r, [prop as string]: oldVal } : r
              ))
            }
            // Error toast
            showToast({ message: '수정에 실패했습니다', type: 'error' }, 2000)
          }
        })()
      }

      // Single setRows for all coalesced updates — one React commit for the whole batch.
      if (rowUpdates.size > 0) {
        skipNextLoadRef.current = true
        setRows(prev => prev.map((r, i) => {
          const patch = rowUpdates.get(i)
          return patch ? { ...r, ...patch } : r
        }))
      }

      // Commit the collected changes as a single batched undo entry.
      if (batchItems.length > 0) {
        undoStackRef.current.push({ items: batchItems })
        if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift()
        redoStackRef.current = []
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
    hotRef.current.addHook('beforeOnCellMouseDown', (e: MouseEvent, coords: { row: number; col: number }) => {
      // Shift+클릭 범위 선택 (No. 컬럼만)
      if (coords.col === 0 && e.shiftKey && lastCheckedRowRefGlobal?.current !== null) {
        if (!lastCheckedRowRefGlobal || !hotRefGlobal?.current) return

        const currentRow = coords.row
        const start = Math.min(lastCheckedRowRefGlobal.current, currentRow)
        const end = Math.max(lastCheckedRowRefGlobal.current, currentRow)
        const data = hotRefGlobal.current.getSourceData() as Row[]

        // 범위 내 모든 행의 id를 checkedRowsRef에 추가
        for (let i = start; i <= end; i++) {
          const id = data[i]?.id
          if (!id) continue
          checkedRowsRefGlobal?.current.add(id)

          // viewport에 보이는 셀만 즉시 DOM 업데이트
          const td = hotRefGlobal.current.getCell(i, 0)
          if (td) {
            const cb = td.querySelector('.row-select-checkbox') as HTMLInputElement
            if (cb) cb.checked = true
          }
        }

        // lastChecked 업데이트
        lastCheckedRowRefGlobal.current = currentRow

        // selectedRowIds state 동기화
        if (checkedRowsRefGlobal && setSelectedRowIdsGlobal) {
          setSelectedRowIdsGlobal(new Set(checkedRowsRefGlobal.current))
        }

        return
      }

      // 기존 select 컬럼 로직
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cd = (COLUMNS as any[])[coords.col]
      if (cd?.fieldType !== 'select' || cd?.readOnly) {
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
      if (colDef?.fieldType !== 'select' || colDef?.readOnly) return
      if (!selectAlreadySelected) return // 첫 클릭: 셀 선택만
      const column = colDef.data as string
      const options = SELECT_COLUMN_OPTIONS[column] ?? []
      const td = hotRef.current?.getCell(coords.row, coords.col) as HTMLElement | null
      if (!td) return
      const rect = td.getBoundingClientRect()
      setSelectMenu({ top: rect.bottom + 4, left: rect.left, row: coords.row, width: Math.max(rect.width, 120), column, options })
    })
    // Row height override — single source of truth for HOT's internal
    // row-height math (viewport, virtualization, scroll). Reads from a ref so
    // updates to the rowHeight state take effect on the next render without
    // needing to re-register the hook.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('modifyRowHeight' as any, (_h: number, _row: number) => rowHeightPxRef.current)

    // Column resize → sync summary bar widths
    hotRef.current.addHook('afterColumnResize', (newSize: number, column: number) => {
      setColWidths(prev => {
        const next = [...prev]
        next[column] = newSize
        return next
      })
    })
    // Column move (header drag OR modal drag OR programmatic) → bump version
    // so `managedColumns` recomputes with the current visual order. Also
    // adjust frozenCount: if the moved column crossed the freeze boundary
    // we grow or shrink the frozen region so the "first N visual columns"
    // invariant is preserved.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterColumnMove' as any, (
      movedColumns: number[],
      finalIndex: number,
      _dropIndex: number | undefined,
      movePossible: boolean,
      orderChanged: boolean,
    ) => {
      setColumnOrderVersion(v => v + 1)
      if (!movePossible || !orderChanged) return
      if (!movedColumns || movedColumns.length !== 1) return
      const oldIdx = movedColumns[0]
      const newIdx = finalIndex
      const cur = frozenCountRef.current
      const wasFrozen = oldIdx < cur
      const isFrozen = newIdx < cur
      if (wasFrozen && !isFrozen) {
        const n = Math.max(0, cur - 1)
        setFrozenCount(n)
        hotRef.current?.updateSettings({ fixedColumnsStart: n })
      } else if (!wasFrozen && isFrozen) {
        const n = cur + 1
        setFrozenCount(n)
        hotRef.current?.updateSettings({ fixedColumnsStart: n })
      }
    })
    // Freeze is now driven entirely by our contextMenu callbacks →
    // setFrozenCount → the dedicated useEffect that syncs fixedColumnsStart.
    // No hook plumbing required here because we dropped manualColumnFreeze.
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
    // Copy: overwrite clipboard with plain TSV + show toast
    hotRef.current.addHook('afterCopy', (data: (string | number | boolean | null)[][]) => {
      const tsv = data
        .map(row => row.map(cell => {
          const val = cell == null ? '' : String(cell)
          return val.includes('\t') || val.includes('\n') ? `"${val}"` : val
        }).join('\t'))
        .join('\n')
      navigator.clipboard.writeText(tsv).catch(() => {})
      showToast({ message: '복사되었습니다', type: 'success' }, 2000)
    })
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

  // Row height change → update CSS var, ref (drives modifyRowHeight hook),
  // and force HOT to recompute viewport dimensions.
  // updateSettings({ rowHeights }) alone doesn't bust Walkontable's measured
  // row-height cache, which causes stale scroll math and clipped rows.
  // modifyRowHeight (registered at init) is the authoritative override; we
  // just need to update the ref + refreshDimensions + render.
  useEffect(() => {
    const px = ROW_HEIGHT_PX[rowHeight]
    const thumbPx = ROW_THUMB_PX[rowHeight]
    rowHeightPxRef.current = px
    imageThumbUrlWidth = ROW_THUMB_URL_W[rowHeight]
    document.documentElement.style.setProperty('--grid-row-h', `${px}px`)
    document.documentElement.style.setProperty('--grid-thumb-size', `${thumbPx}px`)
    const hot = hotRef.current
    if (!hot) return
    hot.refreshDimensions()
    // render() re-invokes every cell renderer, so image cells fetch the new
    // Supabase ?width= URL for the updated thumb size.
    hot.render()
  }, [rowHeight])

  // Frozen count → HOT fixedColumnsStart. Single source of truth for the
  // "freeze from column 1 to N" behavior. Keep the ref in lockstep so the
  // contextMenu callbacks (which closed over values at init time) see the
  // current count in their disabled()/callback() lookups.
  useEffect(() => {
    frozenCountRef.current = frozenCount
    const hot = hotRef.current
    if (!hot) return
    const current = (hot.getSettings().fixedColumnsStart as number) ?? 0
    if (current !== frozenCount) {
      hot.updateSettings({ fixedColumnsStart: frozenCount })
    }
  }, [frozenCount])

  // Hidden columns change → sync with HOT's HiddenColumns plugin.
  // Diff-style: show everything currently hidden, then hide the target set.
  useEffect(() => {
    const hot = hotRef.current
    if (!hot) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = hot.getPlugin('hiddenColumns') as any
    if (!plugin) return
    const prevHidden: number[] = plugin.getHiddenColumns?.() ?? []
    if (prevHidden.length > 0) plugin.showColumns(prevHidden)
    const targetIdx: number[] = []
    hiddenColumns.forEach(prop => {
      const pi = PROP_TO_COL[prop]
      if (typeof pi === 'number') targetIdx.push(pi)
    })
    if (targetIdx.length > 0) plugin.hideColumns(targetIdx)
    hot.render()
  }, [hiddenColumns])

  // Close toolbar dropdowns on outside click.
  useEffect(() => {
    if (!showColumnManager && !showRowHeightMenu && !showExportMenu) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (showColumnManager && !columnManagerRef.current?.contains(t)) setShowColumnManager(false)
      if (showRowHeightMenu && !rowHeightMenuRef.current?.contains(t)) setShowRowHeightMenu(false)
      if (showExportMenu && !exportMenuRef.current?.contains(t)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnManager, showRowHeightMenu, showExportMenu])

  // Cmd/Ctrl+Enter inside the filter modal → apply filter.
  // Kept in its own effect so it rebinds when showFilterModal flips without disturbing the undo listener.
  useEffect(() => {
    if (!showFilterModal) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleLoad()
        setShowFilterModal(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFilterModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Column hide toggle (by data prop key).
  const handleToggleHidden = useCallback((prop: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      if (next.has(prop)) next.delete(prop)
      else next.add(prop)
      return next
    })
  }, [])

  // Show all columns.
  const handleShowAll = useCallback(() => {
    setHiddenColumns(new Set())
  }, [])

  // Hide all columns (except the No. column, which is never in managedColumns).
  const handleHideAll = useCallback(() => {
    const all = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(COLUMNS as any[]).forEach((c: any, i: number) => {
      if (i > 0 && typeof c.data === 'string' && c.data) all.add(c.data)
    })
    setHiddenColumns(all)
  }, [])

  // Drag reorder from the column manager modal. Uses HOT's manualColumnMove
  // plugin. moveColumn(from, to) moves the column at visual index `from` so
  // it lands at visual index `to` in the final order. afterColumnMove hook
  // bumps columnOrderVersion → managedColumns recomputes.
  const handleReorderColumn = useCallback((fromProp: string, toProp: string) => {
    const hot = hotRef.current
    if (!hot) return
    const fromPi = PROP_TO_COL[fromProp]
    const toPi = PROP_TO_COL[toProp]
    if (typeof fromPi !== 'number' || typeof toPi !== 'number') return
    const fromVi = hot.toVisualColumn(fromPi)
    const toVi = hot.toVisualColumn(toPi)
    if (fromVi < 0 || toVi < 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = hot.getPlugin('manualColumnMove') as any
    if (!plugin) return
    plugin.moveColumn(fromVi, toVi)
    hot.render()
  }, [])

  // Reset view — restores column widths, unhides everything, unfreezes everything,
  // and returns rowHeight to Short. Does NOT reset column order (Phase 2).
  const handleResetView = useCallback(() => {
    const hot = hotRef.current
    if (!hot) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hiddenPlugin = hot.getPlugin('hiddenColumns') as any
    const prevHidden: number[] = hiddenPlugin?.getHiddenColumns?.() ?? []
    if (prevHidden.length > 0) hiddenPlugin.showColumns(prevHidden)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultWidths = (COLUMNS as any[]).map((c: any) => c.width ?? 100)
    hot.updateSettings({ colWidths: defaultWidths, fixedColumnsStart: 0 })
    setColWidths(defaultWidths)

    setHiddenColumns(new Set())
    setFrozenCount(0)
    setRowHeight('short')
    setShowColumnManager(false)
    hot.render()
  }, [])

  // CSV export. Skips the No. column, any currently-hidden columns, and image/attachment
  // columns (binary). Checkbox values become 예/아니오. UTF-8 BOM prepended so Excel
  // opens Korean text correctly.
  const handleExportCSV = useCallback((onlySelected: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportCols = (COLUMNS as any[]).filter((c: any, i: number) => {
      if (i === 0) return false
      if (typeof c.data !== 'string' || !c.data) return false
      if (c.fieldType === 'image' || c.fieldType === 'attachment') return false
      if (hiddenColumns.has(c.data)) return false
      return true
    })

    const source = onlySelected
      ? rowsRef.current.filter(r => selectedRowIds.has(r.id))
      : rowsRef.current

    if (source.length === 0) {
      showToast({ message: '내보낼 데이터가 없습니다', type: 'error' }, 2000)
      return
    }

    const escape = (v: unknown): string => {
      if (v == null) return ''
      if (typeof v === 'boolean') return v ? '예' : '아니오'
      const s = String(v)
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const readPath = (row: Row, path: string): unknown => {
      let val: unknown = row
      for (const part of path.split('.')) {
        if (val == null || typeof val !== 'object') return undefined
        val = (val as Record<string, unknown>)[part]
      }
      return val
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const header = exportCols.map((c: any) => escape(c.title)).join(',')
    const body = source.map(row =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exportCols.map((c: any) => escape(readPath(row, c.data))).join(','),
    ).join('\n')
    const csv = '\uFEFF' + header + '\n' + body

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `works_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }, [hiddenColumns, selectedRowIds, showToast])

  // Manageable columns (for the column manager dropdown) — in HOT's current
  // visual order (so reorders from either the header drag or the modal drag
  // are reflected). Excludes the No. column. Depends on columnOrderVersion so
  // reorders trigger recomputation.
  const managedColumns: ManagedColumn[] = useMemo(() => {
    const hot = hotRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (COLUMNS as any[]).length
    const result: ManagedColumn[] = []
    for (let vi = 1; vi < total; vi++) {
      const pi = hot ? hot.toPhysicalColumn(vi) : vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (COLUMNS as any[])[pi]
      if (c && typeof c.data === 'string' && c.data && typeof c.title === 'string') {
        result.push({ data: c.data, title: c.title })
      }
    }
    return result
  }, [columnOrderVersion])

  // Update grid data
  useEffect(() => {
    if (!hotRef.current) return
    if (skipNextLoadRef.current) {
      // Cell-edit path: HOT already applied the change via setDataAtCell.
      // Skip the expensive full reload and dimension refresh.
      skipNextLoadRef.current = false
      return
    }
    hotRef.current.loadData(rows)
    if (rows.length > 0) hotRef.current.refreshDimensions()
  }, [rows])

  // Custom Cmd+Z / Cmd+Shift+Z undo/redo.
  // Drives the same afterChange PATCH pipeline via setDataAtCell with a custom source,
  // so DB sync and rollback behavior are unified with normal edits.
  useEffect(() => {
    const replay = (
      fromStack: React.MutableRefObject<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>,
      toStack: React.MutableRefObject<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>,
      pickValue: (item: { oldVal: unknown; newVal: unknown }) => unknown,
      hotSource: 'undo' | 'redo',
    ) => {
      const hot = hotRef.current
      if (!hot) return
      // Pop entries until one has at least one item whose row is still in the
      // current view (items for soft-deleted/unloaded rows are dropped).
      while (fromStack.current.length > 0) {
        const entry = fromStack.current.pop()!
        const tuples: Array<[number, number, unknown]> = []
        const validItems: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> = []
        for (const item of entry.items) {
          const rowIdx = rowsRef.current.findIndex(r => r.id === item.rowId)
          if (rowIdx === -1) continue
          const col = PROP_TO_COL[item.prop] ?? -1
          if (col < 0) continue
          tuples.push([rowIdx, col, pickValue(item)])
          validItems.push(item)
        }
        if (tuples.length === 0) continue
        // Array form → single afterChange with all changes, keeps batch semantics.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hot.setDataAtCell(tuples as any, hotSource)
        toStack.current.push({ items: validItems })
        if (toStack.current.length > UNDO_LIMIT) toStack.current.shift()
        return
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || e.key.toLowerCase() !== 'z') return
      // Let the native browser undo handle text editing inside an open HOT editor.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = hotRef.current?.getActiveEditor() as any
      if (editor?.isOpened?.()) return
      e.preventDefault()
      if (e.shiftKey) {
        replay(redoStackRef, undoStackRef, entry => entry.newVal, 'redo')
      } else {
        replay(undoStackRef, redoStackRef, entry => entry.oldVal, 'undo')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              reference_files: (n.reference_files as any) ?? row.reference_files,
              updated_at: (n.updated_at as string) ?? row.updated_at,
            }
          }))
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  // Handle row deletion
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedRowIds)
    if (ids.length === 0) return

    try {
      const res = await fetch('/api/order-items/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        showToast({ message: '삭제에 실패했습니다', type: 'error' }, 3000)
        return
      }

      // Remove deleted rows from UI
      setRows(prev => prev.filter(r => !ids.includes(r.id)))

      // Clear selection
      checkedRowsRef.current.clear()
      setSelectedRowIds(new Set())
      lastCheckedRowRef.current = null

      // Show toast with undo action
      showToast({
        message: `${ids.length}개 삭제됨`,
        type: 'success',
        undoAction: async () => {
          try {
            const restoreRes = await fetch('/api/order-items/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            })

            if (!restoreRes.ok) {
              showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
              return
            }

            // Reload data to restore rows
            setOffset(0)
            setFetchTrigger(prev => prev + 1)
            showToast({ message: `${ids.length}개 복구됨`, type: 'success' }, 2000)
          } catch {
            showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
          }
        },
      }, 5000)
    } catch {
      showToast({ message: '삭제에 실패했습니다', type: 'error' }, 3000)
    }
  }

  const handleClearSelection = () => {
    checkedRowsRef.current.clear()
    setSelectedRowIds(new Set())
    lastCheckedRowRef.current = null
    hotRef.current?.render()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: (좌) 필터 / 검색 / 정렬  (우) count */}
      <div className="flex-shrink-0 flex items-center gap-2 border-b border-[#E2E8F0] bg-white px-5 py-2">
        {/* Filter button + modal */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowFilterModal(v => !v); setShowSortModal(false) }}
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5l-4-5z" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            필터
            {filterState.conditions.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{countAllConditions(filterState)}</span>
            )}
          </button>
          {showFilterModal && (
            <FilterModal
              columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string; fieldType: string } => typeof c.data === 'string' && c.data !== '') as FilterColDef[]}
              filterState={filterState}
              selectOptions={FILTER_SELECT_OPTIONS}
              onChange={setFilterState}
              onApply={handleLoad}
              onClose={() => setShowFilterModal(false)}
            />
          )}
        </div>

        {/* Server-side search */}
        <div className="relative flex-shrink-0">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#9CA3AF" strokeWidth="1.2"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="검색..."
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            className="w-48 h-[28px] rounded-[4px] border border-[#E2E8F0] pl-8 pr-[10px] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
          />
        </div>

        {/* Sort button + modal */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowSortModal(v => !v); setShowFilterModal(false) }}
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2v10M2.5 4.5l2-2.5 2 2.5M9.5 12V2M7.5 9.5l2 2.5 2-2.5" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            정렬
            {sortConditions.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{sortConditions.length}</span>
            )}
          </button>
          {showSortModal && (
            <SortModal
              columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string } => typeof c.data === 'string' && c.data !== '') as SortColDef[]}
              conditions={sortConditions}
              onChange={setSortConditions}
              onApply={handleLoad}
              onClose={() => setShowSortModal(false)}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count — right side */}
        <div className="flex items-center text-[12px] text-[#6B7280] whitespace-nowrap flex-shrink-0 mr-2">
          {filterCount !== null && searchCount === null && (
            <span>{filterCount.toLocaleString()}건</span>
          )}
          {filterCount !== null && searchCount !== null && (
            <span>{filterCount.toLocaleString()}건 중 {searchCount.toLocaleString()}건 검색됨</span>
          )}
          {apiError && <span className="text-red-500 ml-2">{apiError}</span>}
        </div>

        {/* Row height selector */}
        <div className="relative flex-shrink-0" ref={rowHeightMenuRef}>
          <button
            type="button"
            onClick={() => { setShowRowHeightMenu(v => !v); setShowColumnManager(false); setShowExportMenu(false) }}
            title="행 높이"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3h10M2 7h10M2 11h10" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {ROW_HEIGHT_LABEL[rowHeight]}
          </button>
          {showRowHeightMenu && (
            <div className="absolute right-0 top-[34px] z-[1000] w-[140px] rounded-[6px] border border-[#E2E8F0] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              {(['short', 'medium', 'tall', 'extra-tall'] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => { setRowHeight(h); setShowRowHeightMenu(false) }}
                  className={`flex w-full items-center justify-between px-3 py-[6px] text-[12px] hover:bg-[#F8FAFC] ${rowHeight === h ? 'text-[#2D7FF9]' : 'text-[#374151]'}`}
                >
                  <span>{ROW_HEIGHT_LABEL[h]}</span>
                  <span className="text-[11px] text-[#9CA3AF]">{ROW_HEIGHT_PX[h]}px</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column manager */}
        <div className="relative flex-shrink-0" ref={columnManagerRef}>
          <button
            type="button"
            onClick={() => { setShowColumnManager(v => !v); setShowRowHeightMenu(false); setShowExportMenu(false) }}
            title="컬럼 관리"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2h10v10H2z M5.5 2v10 M8.5 2v10" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            컬럼
            {hiddenColumns.size > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{hiddenColumns.size}</span>
            )}
          </button>
          {showColumnManager && (
            <ColumnManagerDropdown
              columns={managedColumns}
              hiddenColumns={hiddenColumns}
              onToggleHidden={handleToggleHidden}
              onShowAll={handleShowAll}
              onHideAll={handleHideAll}
              onReorder={handleReorderColumn}
              onResetView={handleResetView}
              onClose={() => setShowColumnManager(false)}
            />
          )}
        </div>

        {/* Export */}
        <div className="relative flex-shrink-0" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => { setShowExportMenu(v => !v); setShowRowHeightMenu(false); setShowColumnManager(false) }}
            title="내보내기"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v7m0 0l-2.5-2.5M7 9l2.5-2.5M2.5 11.5h9" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            내보내기
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-[34px] z-[1000] w-[160px] rounded-[6px] border border-[#E2E8F0] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <button
                type="button"
                onClick={() => { handleExportCSV(false); setShowExportMenu(false) }}
                className="flex w-full items-center px-3 py-[6px] text-[12px] text-[#374151] hover:bg-[#F8FAFC]"
              >
                전체 내보내기 (CSV)
              </button>
              <button
                type="button"
                onClick={() => { handleExportCSV(true); setShowExportMenu(false) }}
                className="flex w-full items-center px-3 py-[6px] text-[12px] text-[#374151] hover:bg-[#F8FAFC]"
              >
                선택 행만 (CSV)
              </button>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts */}
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          title="키보드 단축키"
          aria-label="키보드 단축키"
          className="h-[28px] w-[28px] flex-shrink-0 rounded-[4px] border border-[#E2E8F0] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center justify-center"
        >
          ?
        </button>
      </div>

      {/* Empty state */}
      {!hasData && !loading && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[#9CA3AF]">
          필터를 설정하고 적용하면 데이터가 로드됩니다
        </div>
      )}

      {/* Loading overlay — center of screen */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <span className="text-[14px] text-[#6B7280] font-medium">로딩 중…</span>
        </div>
      )}

      {/* Grid area — flex-1, fills remaining height */}
      <div className={`relative flex flex-col flex-1 min-h-0 overflow-hidden${!hasData && !loading ? ' hidden' : ''}`}>
        {/* HOT container — fills all available space */}
        <div
          ref={hotContainerRef}
          className={`flex-1 min-h-0 overflow-hidden${loading ? ' opacity-30 pointer-events-none' : ''}`}
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

      {/* select 컬럼 커스텀 드롭다운 */}
      {selectMenu && (
        <div
          ref={selectMenuRef}
          role="listbox"
          aria-label="옵션 선택"
          style={{ position: 'fixed', top: selectMenu.top, left: selectMenu.left, minWidth: selectMenu.width, zIndex: 9999 }}
          className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 max-h-[320px] overflow-y-auto"
        >
          {selectMenu.options.map(({ value, bg }) => (
            <div
              key={value}
              role="option"
              aria-selected={false}
              tabIndex={0}
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

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            background: toast.type === 'error' ? '#EF4444' : '#1F2937',
            color: '#fff', fontSize: 13,
            padding: '8px 16px', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => {
                showToast(null)
                toast.undoAction?.()
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              실행취소
            </button>
          )}
        </div>
      )}

      {/* Delete mini bar */}
      {selectedRowIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#1F2937',
          color: '#fff',
          fontSize: 13,
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span>{selectedRowIds.size}개 선택됨</span>
          <button
            onClick={handleClearSelection}
            style={{
              background: 'transparent',
              border: '1px solid #4B5563',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            선택 해제
          </button>
          <button
            onClick={handleDeleteSelected}
            style={{
              background: '#EF4444',
              border: 'none',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            삭제
          </button>
        </div>
      )}

      {/* Image Lightbox */}
      {galleryImages && (
        <ImageModal
          images={galleryImages}
          startIndex={galleryStartIdx}
          onClose={() => setGalleryImages(null)}
        />
      )}
    </div>
  )
}
