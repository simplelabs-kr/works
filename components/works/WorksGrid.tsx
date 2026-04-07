'use client'

import { useEffect, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'

type Row = {
  id: string
  고유_번호: string
  제품명_표시: string
  데드라인: string
  매몰: string
  주물: string
  출고예정일: string
  소재_최종: string
  도금_색상: string
  작업_위치: string
  작업지시서: string
  호수: string
  수량: string | number
  고객명: string
  중량: string | number
  검수: string
  검수_담당: string
  공임_조정액: string | number
  각인_내용: string
  생산시작일: string
}

const COLUMNS = [
  { data: '고유_번호',   title: '고유번호',    width: 120 },
  { data: '제품명_표시', title: '제품명',      width: 200 },
  { data: '데드라인',    title: '데드라인',    width: 100 },
  { data: '매몰',        title: '매몰',        width: 80  },
  { data: '주물',        title: '주물 후 작업', width: 110 },
  { data: '출고예정일',  title: '출고예정일',  width: 100 },
  { data: '소재_최종',   title: '소재',        width: 80  },
  { data: '도금_색상',   title: '도금색상',    width: 90  },
  { data: '작업_위치',   title: '작업위치',    width: 90  },
  { data: '작업지시서',  title: '작업지시서',  width: 100 },
  { data: '호수',        title: '호수',        width: 60  },
  { data: '수량',        title: '수량',        width: 60  },
  { data: '고객명',      title: '고객명',      width: 90  },
  { data: '중량',        title: '중량',        width: 70  },
  { data: '검수',        title: '검수',        width: 55  },
  { data: '검수_담당',   title: '검수담당',    width: 90  },
  { data: '공임_조정액', title: '공임조정액',  width: 90  },
  { data: '각인_내용',   title: '각인내용',    width: 110 },
  { data: '생산시작일',  title: '생산시작일',  width: 100 },
]

const STATUS_OPTIONS = ['♻️ 폐기', '⚒️ 제작 중', '⭕️ 발송 완료', '🎁 포장 대기중', '🚛 발송 대기중']
const STAGE_OPTIONS = ['🔥 주물 작업 필요', '🔵 왁스 작업 필요', '🟠 RP 출력 필요', '🟢 생산 완료', '🟣 현장/광 작업 중', '🟧 RP 출력 중', '외부 제작 제품']

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

export default function WorksGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])

  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  // Load brand list once on mount
  useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(({ data }) => setBrands(data ?? []))
  }, [])

  const debouncedSearch = useDebounce(search, 300)
  const hasFilters =
    debouncedSearch.length > 0 ||
    statuses.length > 0 ||
    stages.length > 0 ||
    selectedBrands.length > 0

  useEffect(() => {
    if (!hasFilters) {
      setRows([])
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    statuses.forEach(s => params.append('statuses', s))
    stages.forEach(s => params.append('stages', s))

    // Resolve brand names → IDs
    const nameToId = new Map(brands.map(b => [b.name, b.id]))
    selectedBrands.forEach(name => {
      const id = nameToId.get(name)
      if (id) params.append('brandIds', id)
    })

    fetch(`/api/order-items?${params}`)
      .then(res => res.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRows((data ?? []).map((item: any) => {
          const 제품명 = item.products?.['제품명'] ?? ''
          const 코드 =
            item.고유_번호?.length === 15
              ? item.고유_번호.slice(-4)
              : item.고유_번호?.slice(-6) ?? ''
          return {
            id: item.id ?? '',
            고유_번호: item.고유_번호 ?? '',
            제품명_표시: `${제품명}[${코드}]`,
            데드라인: formatDate(item.데드라인),
            매몰: item.매몰 ?? '',
            주물: item.주물 ?? '',
            출고예정일: formatDate(item.출고예정일),
            소재_최종: item.소재_최종 ?? '',
            도금_색상: item.도금_색상 ?? '',
            작업_위치: item.작업_위치 ?? '',
            작업지시서: item.작업지시서 ?? '',
            호수: item.호수 ?? '',
            수량: item.수량 ?? '',
            고객명: item.고객명 ?? '',
            중량: item.중량 ?? '',
            검수: item.검수 ? '✓' : '',
            검수_담당: item.검수_담당 ?? '',
            공임_조정액: item.공임_조정액 ?? '',
            각인_내용: item.각인_내용 ?? '',
            생산시작일: formatDate(item.생산시작일),
          }
        }))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedSearch, statuses, stages, selectedBrands, hasFilters, brands])

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
      stretchH: 'none',
      height: 620,
      wordWrap: false,
      manualColumnResize: true,
      autoColumnSize: { useHeaders: true },
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

  const brandNames = brands.map(b => b.name)

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="고유번호, 고객명 검색…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <MultiSelect label="상태" options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
        <MultiSelect label="작업단계" options={STAGE_OPTIONS} selected={stages} onChange={setStages} />
        <MultiSelect label="브랜드" options={brandNames} selected={selectedBrands} onChange={setSelectedBrands} />
        <span className="ml-auto text-sm text-gray-500">
          {loading ? '로딩 중…' : hasFilters ? `총 ${rows.length.toLocaleString()}건` : ''}
        </span>
      </div>

      {/* Placeholder when no filters */}
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
