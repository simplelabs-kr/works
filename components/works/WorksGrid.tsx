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

type SortCol = '발주일' | '생산시작일' | '데드라인'
type SortDir = 'asc' | 'desc'

type SubmittedFilters = {
  search: string
  brand: string
  dateFrom: string
  dateTo: string
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
  { data: '발주_수량',    title: '발주 수량',    readOnly: true, width: 80  },
  { data: '수량',         title: '수량',         readOnly: true, width: 70  },
  { data: '호수',         title: '호수',         readOnly: true, width: 70  },
  { data: '고객명',       title: '고객명',       readOnly: true, width: 100 },
  { data: '디자이너_노트', title: '디자이너 노트', readOnly: true, width: 200 },
  { data: '중량',         title: '중량',         readOnly: true, width: 70  },
  { data: '검수',         title: '검수',         readOnly: true, width: 50  },
  { data: '허용_중량_범위', title: '허용 중량 범위', readOnly: true, width: 130 },
  { data: '중량_검토',    title: '중량 검토',    readOnly: true, width: 70  },
  { data: '기타_옵션',    title: '기타 옵션',    readOnly: true, width: 120 },
  { data: '각인_내용',    title: '각인 내용',    readOnly: true, width: 100 },
  { data: '각인_폰트',    title: '각인 폰트',    readOnly: true, width: 80  },
  { data: '기본_공임',    title: '기본 공임',    readOnly: true, width: 80  },
  { data: '공임_조정액',  title: '공임 조정액',  readOnly: true, width: 80  },
  { data: '확정_공임',    title: '확정 공임',    readOnly: true, width: 80  },
  { data: '번들_명칭',    title: '번들 명칭',    readOnly: true, width: 120 },
  { data: '원부자재',     title: '원부자재',     readOnly: true, width: 150 },
  { data: '발주_현황',    title: '발주 현황',    readOnly: true, width: 150 },
  { data: '작업_위치',    title: '작업 위치',    readOnly: true, width: 90  },
  { data: '검수_유의',    title: '검수 포인트',   readOnly: true, width: 150 },
  { data: '도금_색상',    title: '도금 색상',    readOnly: true, width: 90  },
  { data: '사출_방식',    title: '사출 방식',    readOnly: true, width: 90  },
  { data: '가다번호',     title: '가다번호',     readOnly: true, width: 90  },
  { data: '가다_위치',    title: '가다 위치',    readOnly: true, width: 90  },
  { data: '주물_후_수량', title: '주물 후 수량',  readOnly: true, width: 80  },
  { data: '포장',         title: '포장',         readOnly: true, width: 50  },
  { data: '순금_중량',    title: '순금 중량',    readOnly: true, width: 80  },
  { data: 'rp_출력_시작', title: 'RP 출력 시작',  readOnly: true, width: 80  },
  { data: '왁스_파트_전달', title: '왁스 파트 전달', readOnly: true, width: 100 },
]

// 정렬 가능한 컬럼: 제목 → col index
const SORT_COL_INDEX: Partial<Record<number, SortCol>> = {
  5: '발주일',
  6: '생산시작일',
  7: '데드라인',
}
const SORTABLE_TITLES = new Set<string>(['발주일', '생산시작일', '데드라인'])

function buildColHeaders(sort: { col: SortCol; dir: SortDir }): string[] {
  return COLUMNS.map(c => {
    if (!SORTABLE_TITLES.has(c.title)) return c.title
    if (c.title === sort.col) return `${c.title} ${sort.dir === 'asc' ? '▲' : '▼'}`
    return `${c.title} ⇅`
  })
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
    발주_현황: (item.purchases ?? []).map(p => {
      if (p.재고_사용) return '재고사용'
      if (p.수령) return '✅발주 ✅수령'
      if (p.발주) return '✅발주 수령대기'
      return '발주대기'
    }).join('\n'),
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
  const hotRef = useRef<Handsontable | null>(null)
  const holidaysLoaded = useRef(false)

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
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: '발주일', dir: 'desc' })
  const [offset, setOffset] = useState(0)
  const isAppend = useRef(false)

  // Stable ref for sort click handler (called from Handsontable hook)
  const sortClickRef = useRef<((col: SortCol) => void) | null>(null)
  sortClickRef.current = (col: SortCol) => {
    isAppend.current = false
    setOffset(0)
    setTotalCount(null)
    setSort(prev => ({
      col,
      dir: prev.col === col ? (prev.dir === 'asc' ? 'desc' : 'asc') : 'desc',
    }))
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
    params.set('sortCol', sort.col)
    params.set('sortDir', sort.dir)

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
        if (!cancelled) { setLoading(false); setLoadingMore(false) }
      })

    return () => { cancelled = true }
  }, [submittedFilters, sort, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Handsontable once
  useEffect(() => {
    if (!containerRef.current || hotRef.current) return
    hotRef.current = new Handsontable(containerRef.current, {
      data: [],
      columns: COLUMNS,
      rowHeaders: true,
      colHeaders: buildColHeaders({ col: '발주일', dir: 'desc' }),
      readOnly: true,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'last',
      height: 620,
      wordWrap: false,
      manualColumnResize: true,
      manualColumnMove: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterOnCellMouseDown', (_event: MouseEvent, coords: any) => {
      if (coords.row !== -1) return
      const col = SORT_COL_INDEX[coords.col as number]
      if (col) sortClickRef.current?.(col)
    })
    return () => {
      hotRef.current?.destroy()
      hotRef.current = null
    }
  }, [])

  // Update column headers when sort changes
  useEffect(() => {
    if (!hotRef.current) return
    hotRef.current.updateSettings({ colHeaders: buildColHeaders(sort) })
  }, [sort])

  // Update grid data
  useEffect(() => {
    if (!hotRef.current) return
    hotRef.current.loadData(rows)
    if (rows.length > 0) hotRef.current.refreshDimensions()
  }, [rows])

  const showLoadMore = !loadingMore && totalCount !== null && rows.length < totalCount

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">제품명/고유번호</label>
          <input
            type="text"
            placeholder="검색어"
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">브랜드</label>
          <input
            type="text"
            placeholder="브랜드명"
            value={inputBrand}
            onChange={e => setInputBrand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">발주일</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={inputDateFrom}
              onChange={e => setInputDateFrom(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="date"
              value={inputDateTo}
              onChange={e => setInputDateTo(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="rounded bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600 active:bg-blue-700 self-end"
        >
          검색
        </button>
        <span className="ml-auto self-end text-sm text-gray-500">
          {loading
            ? '로딩 중…'
            : apiError
            ? <span className="text-red-500 text-xs">{apiError}</span>
            : hasAnyFilter && totalCount !== null
            ? `총 ${totalCount.toLocaleString()}건 중 ${rows.length.toLocaleString()}건 표시`
            : null}
        </span>
      </div>

      {!hasAnyFilter && (
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-gray-200 text-sm text-gray-400">
          필터를 선택하면 결과가 표시됩니다
        </div>
      )}

      <div className={`${!hasAnyFilter ? 'hidden' : ''} ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div ref={containerRef} />
      </div>

      {showLoadMore && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              isAppend.current = true
              setOffset(o => o + 100)
            }}
            className="rounded border px-6 py-1.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          >
            더보기 ({rows.length.toLocaleString()} / {totalCount.toLocaleString()})
          </button>
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center text-sm text-gray-400">로딩 중…</div>
      )}
    </div>
  )
}
