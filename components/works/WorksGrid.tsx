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
  체인_길이: string | null
  체인_두께: string | null
  brands: { name: string } | null
  products: { 제품명: string; 제작_소요일: number | null } | null
  metals: { name: string; purity: string | null } | null
}

type Item = {
  id: string
  고유_번호: string
  중량: number | null
  데드라인: string | null
  출고일: string | null
  발송일: string | null
  중단_취소: boolean | null
  검수: boolean | null
  포장: boolean | null
  출고: boolean | null
  가다번호: string | null
  가다_위치: string | null
  bundle_id: string | null
  metal_price_id: string | null
  order_id: string | null
  orders: Orders | null
  metal_prices: { price_per_gram: number | null } | null
  products: { 제품명: string; 제작_소요일: number | null } | null
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
}

const COLUMNS = [
  { data: '고유_번호',    title: '고유번호',        width: 140 },
  { data: '제품명',      title: '제품명',          width: 200 },
  { data: '제품명_코드',  title: '제품명(코드 포함)', width: 220 },
  { data: 'metals.name',  title: '소재',           readOnly: true, width: 100 },
  { data: 'metals.purity', title: '함량비',         readOnly: true, width: 70  },
  { data: '발주일',      title: '발주일',           width: 110 },
  { data: '생산시작일',   title: '생산시작일',       width: 110 },
  { data: '데드라인',    title: '데드라인',          width: 110 },
  { data: '출고예정일',   title: '출고예정일',       width: 110 },
  { data: '시세_g당',    title: '시세 (g당)',       readOnly: true, width: 80  },
  { data: '소재비',      title: '소재비',           readOnly: true, width: 90  },
]

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

// 생산시작일을 1일차로 하여 영업일 기준 days일을 채운 후 다음 영업일 반환
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val: string | null | undefined): string {
  if (!val) return ''
  return String(val).slice(0, 10)
}

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// ── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border rounded px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition-colors"
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 text-xs font-medium">
            {selected.length}
          </span>
        )}
        <span className="text-[10px] text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-md shadow-lg min-w-[160px] max-h-72 overflow-y-auto">
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-blue-600"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WorksGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)
  const holidaysLoaded = useRef(false)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const handleSearch = () => setSubmittedSearch(search.trim())

  // Load holidays once on mount (cached in module-level Set)
  useEffect(() => {
    if (holidaysLoaded.current) return
    holidaysLoaded.current = true
    fetch('/api/holidays')
      .then(res => res.json())
      .then(({ dates }) => {
        if (Array.isArray(dates)) holidaySet = new Set<string>(dates)
      })
  }, [])

  const hasFilters = submittedSearch.length > 0

  useEffect(() => {
    if (!hasFilters) {
      setRows([])
      setApiError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setApiError(null)

    const params = new URLSearchParams()
    params.set('search', submittedSearch)

    fetch(`/api/order-items?${params}`)
      .then(res => res.json())
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setApiError(error); return }
        setRows((data ?? []).map((item: Item) => {
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
          }
        }))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [submittedSearch, hasFilters])

  // Initialize Handsontable once
  useEffect(() => {
    if (!containerRef.current || hotRef.current) return
    hotRef.current = new Handsontable(containerRef.current, {
      data: [],
      columns: COLUMNS,
      rowHeaders: true,
      colHeaders: true,
      readOnly: true,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'last',
      height: 620,
      wordWrap: false,
      manualColumnResize: true,
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="고유번호 또는 제품명 검색…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          className="border rounded px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={handleSearch}
          className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 active:bg-blue-700"
        >
          검색
        </button>
<span className="ml-auto text-sm text-gray-500">
          {loading ? '로딩 중…' : apiError ? <span className="text-red-500 text-xs">{apiError}</span> : hasFilters ? `총 ${rows.length.toLocaleString()}건` : ''}
        </span>
      </div>

      {!hasFilters && (
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-gray-200 text-sm text-gray-400">
          필터를 선택하면 결과가 표시됩니다
        </div>
      )}

      <div className={`${!hasFilters ? 'hidden' : ''} ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div ref={containerRef} />
      </div>
    </div>
  )
}
