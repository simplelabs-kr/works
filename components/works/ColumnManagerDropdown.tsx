'use client'

import { useMemo, useState } from 'react'

export type ManagedColumn = {
  data: string
  title: string
}

type Props = {
  columns: ManagedColumn[]          // excludes the No. column
  hiddenColumns: Set<string>         // by data prop key
  frozenColumns: Set<string>         // by data prop key
  onToggleHidden: (prop: string) => void
  onToggleFrozen: (prop: string) => void
  onResetView: () => void
  onClose: () => void
}

export default function ColumnManagerDropdown({
  columns,
  hiddenColumns,
  frozenColumns,
  onToggleHidden,
  onToggleFrozen,
  onResetView,
  onClose,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return columns
    return columns.filter(c => c.title.toLowerCase().includes(q) || c.data.toLowerCase().includes(q))
  }, [columns, search])

  return (
    <div
      className="absolute right-0 top-[34px] z-50 w-[280px] rounded-[6px] border border-[#E2E8F0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="border-b border-[#E2E8F0] p-2">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="컬럼 검색..."
          className="h-[28px] w-full rounded-[4px] border border-[#E2E8F0] px-2 text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#2D7FF9] focus:outline-none"
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#9CA3AF]">결과 없음</div>
        )}
        {filtered.map(col => {
          const isHidden = hiddenColumns.has(col.data)
          const isFrozen = frozenColumns.has(col.data)
          return (
            <label
              key={col.data}
              className="flex cursor-pointer items-center gap-2 px-3 py-[5px] text-[12px] text-[#111827] hover:bg-[#F8FAFC]"
            >
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => onToggleHidden(col.data)}
                className="h-[13px] w-[13px] flex-shrink-0 cursor-pointer"
              />
              <span className="flex-1 truncate">{col.title}</span>
              <button
                type="button"
                aria-label={isFrozen ? '고정 해제' : '컬럼 고정'}
                title={isFrozen ? '고정 해제' : '컬럼 고정'}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFrozen(col.data) }}
                className={`flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-[3px] ${isFrozen ? 'text-[#2D7FF9]' : 'text-[#9CA3AF] hover:text-[#374151]'}`}
              >
                <PinIcon filled={isFrozen} />
              </button>
            </label>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-[#E2E8F0] p-2">
        <button
          type="button"
          onClick={onResetView}
          className="text-[12px] text-[#6B7280] hover:text-[#EF4444]"
        >
          뷰 리셋
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-[#6B7280] hover:text-[#111827]"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

function PinIcon({ filled }: { filled: boolean }) {
  // Simple pin glyph. Filled when frozen; stroke-only when not.
  if (filled) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7.5 1h-3L4 3.5 2.5 5v1h3v4L6 11l.5-1V6h3V5L8 3.5 7.5 1z" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.5 1h-3L4 3.5 2.5 5v1h3v4L6 11l.5-1V6h3V5L8 3.5 7.5 1z" />
    </svg>
  )
}
