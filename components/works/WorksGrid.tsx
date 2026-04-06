'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'

const PAGE_SIZE = 100

type Row = {
  고유_번호: string
  브랜드명: string
  제품명: string
  소재: string
  호수: string
  수량: string | number
  상태: string
  작업_단계: string
  발주일: string
  데드라인: string
}

const COLUMNS = [
  { data: '고유_번호', title: '고유번호', width: 110 },
  { data: '브랜드명', title: '브랜드', width: 100 },
  { data: '제품명', title: '제품명', width: 180 },
  { data: '소재', title: '소재', width: 80 },
  { data: '호수', title: '호수', width: 60 },
  { data: '수량', title: '수량', width: 60 },
  { data: '상태', title: '상태', width: 90 },
  { data: '작업_단계', title: '작업단계', width: 110 },
  { data: '발주일', title: '발주일', width: 100 },
  { data: '데드라인', title: '데드라인', width: 100 },
]

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
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-md shadow-lg min-w-[130px] max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">옵션 없음</p>
          ) : (
            options.map(opt => (
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
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function WorksGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)

  const [rows, setRows] = useState<Row[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [statusOpts, setStatusOpts] = useState<string[]>([])
  const [stageOpts, setStageOpts] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)

  // Load filter options once on mount (server-side via API route)
  useEffect(() => {
    fetch('/api/order-items/options')
      .then(res => res.json())
      .then(({ statuses, stages }) => {
        setStatusOpts(statuses ?? [])
        setStageOpts(stages ?? [])
      })
  }, [])

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statuses, stages])

  // Fetch data via server API route (uses service role key)
  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statuses.length > 0) params.set('statuses', statuses.join(','))
    if (stages.length > 0) params.set('stages', stages.join(','))

    const res = await fetch(`/api/order-items?${params}`)
    const { data, hasMore: more } = await res.json()

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRows(data.map((item: any) => ({
        고유_번호: item.고유_번호 ?? '',
        브랜드명: item.brands?.name ?? '',
        제품명: item.products?.['제품명'] ?? '',
        소재: item.소재 ?? '',
        호수: item.호수 ?? '',
        수량: item.수량 ?? '',
        상태: item.상태 ?? '',
        작업_단계: item.작업_단계 ?? '',
        발주일: item.발주일 ?? '',
        데드라인: item.데드라인 ?? '',
      })))
      setHasMore(more ?? false)
    }
    setLoading(false)
  }, [page, debouncedSearch, statuses, stages])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Initialize Handsontable (client-only, once)
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
      height: 600,
      wordWrap: false,
      manualColumnResize: true,
    })
    return () => {
      hotRef.current?.destroy()
      hotRef.current = null
    }
  }, [])

  // Update grid data when rows change
  useEffect(() => {
    hotRef.current?.loadData(rows)
  }, [rows])

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
        <MultiSelect
          label="상태"
          options={statusOpts}
          selected={statuses}
          onChange={setStatuses}
        />
        <MultiSelect
          label="작업단계"
          options={stageOpts}
          selected={stages}
          onChange={setStages}
        />
        <span className="ml-auto text-sm text-gray-500">
          {loading ? '로딩 중…' : `${page + 1} 페이지 · ${rows.length}건`}
        </span>
      </div>

      {/* Grid */}
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        <div ref={containerRef} />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          disabled={page === 0 || loading}
          onClick={() => setPage(p => p - 1)}
          className="px-4 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          이전
        </button>
        <span className="text-sm text-gray-500">{page + 1} 페이지</span>
        <button
          disabled={!hasMore || loading}
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-1.5 border rounded text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
