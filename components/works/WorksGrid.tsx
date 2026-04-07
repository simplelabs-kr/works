'use client'

import { useEffect, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'

type Row = {
  고유_번호: string
  제품명: string
  product_id: string
}

const COLUMNS = [
  { data: '고유_번호',  title: '고유번호',  width: 140 },
  { data: '제품명',    title: '제품명',    width: 220 },
  { data: 'product_id', title: 'product_id', width: 300 },
]

const STATUS_OPTIONS = ['♻️ 폐기', '⚒️ 제작 중', '⭕️ 발송 완료', '🎁 포장 대기중', '🚛 발송 대기중']
const STAGE_OPTIONS = ['🔥 주물 작업 필요', '🔵 왁스 작업 필요', '🟠 RP 출력 필요', '🟢 생산 완료', '🟣 현장/광 작업 중', '🟧 RP 출력 중', '외부 제작 제품']

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

  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)
  const hasFilters =
    debouncedSearch.length > 0 || statuses.length > 0 || stages.length > 0

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

    fetch(`/api/order-items?${params}`)
      .then(res => res.json())
      .then(({ data }) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRows((data ?? []).map((item: any) => ({
          고유_번호: item.고유_번호 ?? '',
          제품명: item.products?.['제품명'] ?? '',
          product_id: item.product_id ?? '',
        })))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedSearch, statuses, stages, hasFilters])

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
          placeholder="고유번호, 고객명 검색…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <MultiSelect label="상태" options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
        <MultiSelect label="작업단계" options={STAGE_OPTIONS} selected={stages} onChange={setStages} />
        <span className="ml-auto text-sm text-gray-500">
          {loading ? '로딩 중…' : hasFilters ? `총 ${rows.length.toLocaleString()}건` : ''}
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
