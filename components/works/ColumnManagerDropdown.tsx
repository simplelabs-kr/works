'use client'

import { useMemo, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'

export type ManagedColumn = {
  data: string
  title: string
}

type Props = {
  columns: ManagedColumn[]          // current visual order, excludes the No. column
  hiddenColumns: Set<string>        // by data prop key
  onToggleHidden: (prop: string) => void
  onShowAll: () => void
  onHideAll: () => void
  onReorder: (fromProp: string, toProp: string) => void
  onResetView: () => void
  onClose: () => void
}

export default function ColumnManagerDropdown({
  columns,
  hiddenColumns,
  onToggleHidden,
  onShowAll,
  onHideAll,
  onReorder,
  onResetView,
  onClose,
}: Props) {
  const [search, setSearch] = useState('')
  const [dragProp, setDragProp] = useState<string | null>(null)
  const [overProp, setOverProp] = useState<string | null>(null)

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return columns
    return columns.filter(c => c.title.toLowerCase().includes(q) || c.data.toLowerCase().includes(q))
  }, [columns, q])

  // Drag reorder is disabled while searching: the visible list is a subset, so
  // dropping "above item X in the filtered list" is ambiguous against the full
  // column order HOT owns. Clear search to reorder.
  const canDrag = q === ''

  const handleDragStart = (e: ReactDragEvent<HTMLDivElement>, prop: string) => {
    setDragProp(prop)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', prop)
  }
  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>, prop: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overProp !== prop) setOverProp(prop)
  }
  const handleDrop = (e: ReactDragEvent<HTMLDivElement>, prop: string) => {
    e.preventDefault()
    const from = dragProp ?? e.dataTransfer.getData('text/plain')
    setDragProp(null)
    setOverProp(null)
    if (from && from !== prop) onReorder(from, prop)
  }
  const handleDragEnd = () => {
    setDragProp(null)
    setOverProp(null)
  }

  return (
    <div
      className="absolute right-0 top-[34px] z-[1000] w-[280px] rounded-[6px] border border-[#E2E8F0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
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
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={onShowAll}
            className="flex-1 h-[24px] rounded-[4px] border border-[#E2E8F0] text-[11px] text-[#374151] hover:bg-[#F8FAFC]"
          >
            모두 표시
          </button>
          <button
            type="button"
            onClick={onHideAll}
            className="flex-1 h-[24px] rounded-[4px] border border-[#E2E8F0] text-[11px] text-[#374151] hover:bg-[#F8FAFC]"
          >
            모두 숨기기
          </button>
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#9CA3AF]">결과 없음</div>
        )}
        {filtered.map(col => {
          const isHidden = hiddenColumns.has(col.data)
          const isDragging = dragProp === col.data
          const isOver = canDrag && overProp === col.data && dragProp !== null && dragProp !== col.data
          return (
            <div
              key={col.data}
              draggable={canDrag}
              onDragStart={canDrag ? e => handleDragStart(e, col.data) : undefined}
              onDragOver={canDrag ? e => handleDragOver(e, col.data) : undefined}
              onDrop={canDrag ? e => handleDrop(e, col.data) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
              className={`flex items-center gap-2 px-2 py-[5px] text-[12px] text-[#111827] hover:bg-[#F8FAFC] ${isDragging ? 'opacity-40' : ''} ${isOver ? 'border-t-2 border-[#2D7FF9]' : 'border-t-2 border-transparent'}`}
              style={{ cursor: canDrag ? 'grab' : 'default' }}
            >
              <span
                aria-hidden="true"
                title={canDrag ? '드래그로 순서 변경' : '검색 중에는 순서 변경 불가'}
                className="flex-shrink-0 select-none text-[14px] leading-none text-[#9CA3AF]"
                style={{ cursor: canDrag ? 'grab' : 'not-allowed' }}
              >
                ⠿
              </span>
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => onToggleHidden(col.data)}
                className="h-[13px] w-[13px] flex-shrink-0 cursor-pointer"
                draggable={false}
              />
              <span
                onClick={() => onToggleHidden(col.data)}
                className="flex-1 cursor-pointer truncate"
              >
                {col.title}
              </span>
            </div>
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
