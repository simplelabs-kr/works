'use client'

import { useEffect, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'

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
  사출_방식: string | null
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
  고유_번호: string
  제품명: string
  제품명_코드: string
  metals: { name: string; purity: string | null }
  발주일: string
  생산시작일: string
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
  검수: string
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
  포장: string
  순금_중량: string
  rp_출력_시작: string
  왁스_파트_전달: string
}

type SubmittedFilters = {
  search: string
  brand: string
  dateFrom: string
  dateTo: string
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
      td.style.cssText = 'color:#9CA3AF;font-size:11px;text-align:center;vertical-align:middle;line-height:36px;background:#F9FAFB;'
    },
  },
  { data: '고유_번호',    title: '고유번호',        width: 140, fieldType: 'text'     as FieldType },
  { data: '제품명',      title: '제품명',          width: 200, fieldType: 'lookup'   as FieldType },
  { data: '제품명_코드',  title: '제품명(코드 포함)', width: 220, fieldType: 'lookup'   as FieldType },
  { data: 'metals.name',  title: '소재',   readOnly: true, width: 100, fieldType: 'lookup'   as FieldType },
  { data: 'metals.purity', title: '함량비', readOnly: true, width: 70,  fieldType: 'lookup'   as FieldType },
  { data: '발주일',      title: '발주일',           width: 110, fieldType: 'lookup'   as FieldType },
  { data: '생산시작일',   title: '생산시작일',       width: 110, fieldType: 'lookup'   as FieldType },
  { data: '데드라인',    title: '데드라인',          width: 110, fieldType: 'date'     as FieldType },
  { data: '출고예정일',   title: '출고예정일',       width: 110, fieldType: 'date'     as FieldType },
  { data: '시세_g당',    title: '시세 (g당)',  readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '소재비',      title: '소재비',     readOnly: true, width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '발주_수량',    title: '발주 수량',  readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '수량',         title: '수량',      readOnly: true, width: 70,  fieldType: 'number'   as FieldType },
  { data: '호수',         title: '호수',      readOnly: true, width: 70,  fieldType: 'lookup'   as FieldType },
  { data: '고객명',       title: '고객명',    readOnly: true, width: 100, fieldType: 'lookup'   as FieldType },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: true, width: 200, fieldType: 'longtext' as FieldType },
  { data: '중량',         title: '중량',      readOnly: true, width: 70,  fieldType: 'number'   as FieldType },
  { data: '검수',         title: '검수',      readOnly: true, width: 50,  fieldType: 'checkbox' as FieldType },
  { data: '허용_중량_범위', title: '허용 중량 범위', readOnly: true, width: 130, fieldType: 'formula'  as FieldType },
  { data: '중량_검토',    title: '중량 검토',  readOnly: true, width: 70,  fieldType: 'formula'  as FieldType },
  { data: '기타_옵션',    title: '기타 옵션',  readOnly: true, width: 120, fieldType: 'lookup'   as FieldType },
  { data: '각인_내용',    title: '각인 내용',  readOnly: true, width: 100, fieldType: 'lookup'   as FieldType },
  { data: '각인_폰트',    title: '각인 폰트',  readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '기본_공임',    title: '기본 공임',  readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '공임_조정액',  title: '공임 조정액', readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '확정_공임',    title: '확정 공임',  readOnly: true, width: 80,  fieldType: 'lookup'   as FieldType },
  { data: '번들_명칭',    title: '번들 명칭',  readOnly: true, width: 120, fieldType: 'lookup'   as FieldType },
  { data: '원부자재',     title: '원부자재',   readOnly: true, width: 150, fieldType: 'lookup'   as FieldType },
  { data: '발주_현황',    title: '발주 현황',  readOnly: true, width: 150, fieldType: 'formula'  as FieldType, renderer: purchaseStatusRenderer },
  { data: '작업_위치',    title: '작업 위치',  readOnly: true, width: 90,  fieldType: 'select'   as FieldType },
  { data: '검수_유의',    title: '검수 포인트', readOnly: true, width: 150, fieldType: 'lookup'   as FieldType },
  { data: '도금_색상',    title: '도금 색상',  readOnly: true, width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '사출_방식',    title: '사출 방식',  readOnly: true, width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '가다번호',     title: '가다번호',   readOnly: true, width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '가다_위치',    title: '가다 위치',  readOnly: true, width: 90,  fieldType: 'lookup'   as FieldType },
  { data: '주물_후_수량', title: '주물 후 수량', readOnly: true, width: 80, fieldType: 'number'   as FieldType },
  { data: '포장',         title: '포장',      readOnly: true, width: 50,  fieldType: 'checkbox' as FieldType },
  { data: '순금_중량',    title: '순금 중량',  readOnly: true, width: 80,  fieldType: 'formula'  as FieldType },
  { data: 'rp_출력_시작', title: 'RP 출력 시작', readOnly: true, width: 80, fieldType: 'checkbox' as FieldType },
  { data: '왁스_파트_전달', title: '왁스 파트 전달', readOnly: true, width: 100, fieldType: 'checkbox' as FieldType },
]

// ── Field type icons ─────────────────────────────────────────────────────────

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'checkbox' | 'select' | 'lookup' | 'formula'

function getFieldTypeIcon(type: FieldType): string {
  const s = 'stroke="#374151" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"'
  const icons: Record<FieldType, string> = {
    text:     `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0.5" y="9.5" font-size="11" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#374151" stroke="none">A</text></svg>`,
    longtext: `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="11" y2="6"/><line x1="1" y1="9" x2="7" y2="9"/></svg>`,
    number:   `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><line x1="4.5" y1="1" x2="3" y2="11"/><line x1="8.5" y1="1" x2="7" y2="11"/><line x1="1.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="1" y1="7.5" x2="10" y2="7.5"/></svg>`,
    date:     `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1" y="2" width="10" height="9" rx="1.5"/><line x1="4" y1="1" x2="4" y2="3.5"/><line x1="8" y1="1" x2="8" y2="3.5"/><line x1="1" y1="5" x2="11" y2="5"/></svg>`,
    checkbox: `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/><polyline points="3.5,6 5.5,8 8.5,4"/></svg>`,
    select:   `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#374151" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="4.5"/><polyline points="4,5.5 6,7.5 8,5.5"/></svg>`,
    lookup:   `<svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" ${s}><path d="M2 10 L10 2"/><polyline points="5,2 10,2 10,7"/></svg>`,
    formula:  `<svg width="17" height="15" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0" y="9.5" font-size="10" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" fill="#374151" stroke="none" font-style="italic">fx</text></svg>`,
  }
  return icons[type] ?? ''
}

// ── Purchase status renderer ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function purchaseStatusRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  td.innerHTML = ''
  if (!value) return
  const config: Record<string, { bg: string; color: string }> = {
    '발주 필요': { bg: '#FEE2E2', color: '#991B1B' },
    '수령 필요': { bg: '#FEF3C7', color: '#92400E' },
    '수령 완료': { bg: '#D1FAE5', color: '#065F46' },
  }
  const c = config[value]
  if (!c) return
  const badge = document.createElement('span')
  badge.textContent = value
  badge.style.cssText = `
    display:inline-block;
    padding:2px 8px;
    border-radius:9999px;
    font-size:11px;
    font-weight:600;
    background:${c.bg};
    color:${c.color};
    white-space:nowrap;
  `
  td.style.verticalAlign = 'middle'
  td.style.paddingTop = '6px'
  td.appendChild(badge)
}

function buildColHeaders(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (COLUMNS as any[]).map((c) => c.title ?? '')
}

// ── Workday helpers ──────────────────────────────────────────────────────────

let holidaySet = new Set<string>()

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

function mapItem(item: Item): Row {
  const o = item.orders
  const 제품명 = item.products?.['제품명'] ?? ''
  const 코드 = item.고유_번호?.length === 15
    ? item.고유_번호.slice(-4)
    : item.고유_번호?.slice(-6) ?? ''
  const pricePerGram = item.metal_prices?.price_per_gram ?? null
  const purity = Number(o?.metals?.purity ?? 0)
  return {
    고유_번호: item.고유_번호 ?? '',
    제품명,
    제품명_코드: 제품명 ? `${제품명}[${코드}]` : '',
    metals: { name: o?.metals?.name ?? '', purity: o?.metals?.purity ?? null },
    발주일: formatDate(o?.발주일),
    생산시작일: formatDate(o?.생산시작일),
    데드라인: formatDate(item.데드라인),
    출고예정일: calcShipDate(item, holidaySet),
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
    검수: item.검수 ? '✅' : '',
    허용_중량_범위: item.products?.기준_중량 != null
      ? `${(item.products.기준_중량 * 0.9).toFixed(2)} ~ ${(item.products.기준_중량 * 1.1).toFixed(2)} g`
      : '',
    중량_검토: (() => {
      const w = item.중량
      const base = item.products?.기준_중량 ?? null
      if (w == null || base == null) return ''
      return (w >= base * 0.9 && w <= base * 1.1) ? '✅' : '⚠️'
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
    사출_방식: o?.사출_방식 ?? '',
    가다번호: item.products?.product_molds?.[0]?.molds?.가다번호 ?? null,
    가다_위치: item.products?.product_molds?.[0]?.molds?.mold_positions?.보관함_위치 ?? null,
    주물_후_수량: item.주물_후_수량 ?? null,
    포장: item.포장 ? '✅' : '',
    순금_중량: (item.중량 != null && purity > 0)
      ? (item.중량 * (purity / 100)).toFixed(3)
      : '',
    rp_출력_시작: item.rp_출력_시작 ? '✅' : '',
    왁스_파트_전달: item.왁스_파트_전달 ? '✅' : '',
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WorksGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotContainerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)
  const holidaysLoaded = useRef(false)

  // Refs for infinite scroll (avoid stale closures in HOT hooks)
  const rowsRef = useRef<Row[]>([])
  const totalCountRef = useRef<number | null>(null)
  const isScrollLoadingRef = useRef(false)
  const scrollLoadRef = useRef<(() => void) | null>(null)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  // Filter input state (not yet submitted)
  const [inputSearch, setInputSearch] = useState('')
  const [inputBrand, setInputBrand] = useState('')
  const [inputDateFrom, setInputDateFrom] = useState('')
  const [inputDateTo, setInputDateTo] = useState('')

  // Submitted query state (triggers API)
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters | null>(null)
  const [offset, setOffset] = useState(0)
  const isAppend = useRef(false)

  // Sync refs for infinite scroll
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { totalCountRef.current = totalCount }, [totalCount])

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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const hasAnyFilter = !!submittedFilters && (
    submittedFilters.search.length > 0 ||
    submittedFilters.brand.length > 0 ||
    submittedFilters.dateFrom.length > 0 ||
    submittedFilters.dateTo.length > 0
  )

  // Load holidays once on mount
  useEffect(() => {
    if (holidaysLoaded.current) return
    holidaysLoaded.current = true
    fetch('/api/holidays')
      .then(res => res.json())
      .then(({ dates }) => {
        if (Array.isArray(dates)) holidaySet = new Set<string>(dates)
      })
  }, [])

  // Fetch data on filter/sort/offset change
  useEffect(() => {
    if (!submittedFilters) { setRows([]); setApiError(null); return }

    const anyFilter =
      submittedFilters.search.length > 0 ||
      submittedFilters.brand.length > 0 ||
      submittedFilters.dateFrom.length > 0 ||
      submittedFilters.dateTo.length > 0
    if (!anyFilter) { setRows([]); setApiError(null); return }

    const shouldAppend = isAppend.current
    isAppend.current = false

    let cancelled = false
    if (shouldAppend) setLoadingMore(true)
    else setLoading(true)
    setApiError(null)

    const params = new URLSearchParams()
    if (submittedFilters.search)   params.set('search', submittedFilters.search)
    if (submittedFilters.brand)    params.set('brand', submittedFilters.brand)
    if (submittedFilters.dateFrom) params.set('dateFrom', submittedFilters.dateFrom)
    if (submittedFilters.dateTo)   params.set('dateTo', submittedFilters.dateTo)
    params.set('offset', String(offset))
    params.set('sortCol', '발주일')
    params.set('sortDir', 'desc')

    fetch(`/api/order-items?${params}`)
      .then(res => res.json())
      .then(({ data, error, totalCount: tc }) => {
        if (cancelled) return
        if (error) { setApiError(error); return }
        const mapped = (data ?? []).map(mapItem)
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
  }, [submittedFilters, offset]) // eslint-disable-line react-hooks/exhaustive-deps

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
      colHeaders: buildColHeaders(),
      readOnly: true,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      height: hotContainerRef.current?.clientHeight || 600,
      wordWrap: false,
      autoColumnSize: false,
      manualColumnResize: true,
      manualColumnMove: true,
      columnHeaderHeight: 29,
      rowHeights: 29,
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
        syncing = false
      })
    }, 100)
    // Field type icons via DOM manipulation (avoids HOT HTML escaping)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterGetColHeader', (col: number, TH: HTMLTableCellElement) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (COLUMNS as any[])[col]
      if (!colDef || !colDef.fieldType) return
      if (TH.querySelector('.field-type-icon')) return
      const div = TH.querySelector('.colHeader') as HTMLElement | null
      if (!div) return
      const icon = document.createElement('span')
      icon.className = 'field-type-icon'
      icon.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;vertical-align:middle;flex-shrink:0;'
      icon.innerHTML = getFieldTypeIcon(colDef.fieldType as FieldType)
      div.style.display = 'inline-flex'
      div.style.alignItems = 'center'
      div.insertBefore(icon, div.firstChild)
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

  // Update grid data
  useEffect(() => {
    if (!hotRef.current) return
    hotRef.current.loadData(rows)
    if (rows.length > 0) hotRef.current.refreshDimensions()
  }, [rows])

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar — shrink-0, px-5 only */}
      <div className="flex-shrink-0 flex flex-wrap items-end gap-3 border-b border-[#E5E7EB] bg-white px-5 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">제품명/고유번호</label>
          <input
            type="text"
            placeholder="검색어"
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-48 rounded-[6px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#6B7280] focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">브랜드</label>
          <input
            type="text"
            placeholder="브랜드명"
            value={inputBrand}
            onChange={e => setInputBrand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-36 rounded-[6px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#6B7280] focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">발주일</label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={inputDateFrom}
              onChange={e => setInputDateFrom(e.target.value)}
              className="rounded-[6px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] text-[#111827] focus:border-[#6B7280] focus:outline-none"
            />
            <span className="text-[#9CA3AF] text-sm">–</span>
            <input
              type="date"
              value={inputDateTo}
              onChange={e => setInputDateTo(e.target.value)}
              className="rounded-[6px] border border-[#D1D5DB] px-[10px] py-[6px] text-[13px] text-[#111827] focus:border-[#6B7280] focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="self-end rounded-[6px] bg-[#111827] px-[14px] py-[6px] text-[13px] font-medium text-white hover:bg-[#1F2937] active:bg-[#374151] transition-colors"
        >
          검색
        </button>
        <span className="ml-auto self-end text-[12px] text-[#6B7280]">
          {loading
            ? '로딩 중…'
            : apiError
            ? <span className="text-red-500">{apiError}</span>
            : hasAnyFilter && totalCount !== null
            ? `총 ${totalCount.toLocaleString()}건 중 ${rows.length.toLocaleString()}건 표시`
            : null}
        </span>
      </div>

      {/* Empty state */}
      {!hasAnyFilter && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[#9CA3AF]">
          필터를 입력하고 검색하면 결과가 표시됩니다
        </div>
      )}

      {/* Grid area — flex-1, fills remaining height */}
      <div className={`flex flex-col flex-1 min-h-0 overflow-hidden${!hasAnyFilter ? ' hidden' : ''}`}>
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
      </div>
    </div>
  )
}
