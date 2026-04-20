'use client'

import { useEffect, useRef, useState } from 'react'

// ColPicker 의 value 는 `col.data` (flat 테이블 물리 컬럼명) 다.
// 사용자에게는 `col.title` 이 보이고, onChange 는 col.data 를 돌려준다.
// 필터/정렬 state 가 title 대신 data 로 key 잡히게 해 title 변경이나
// title≠data 케이스에서도 안전하다.
interface ColPickerProps {
  columns: { data: string; title: string }[]
  value: string
  onChange: (dataKey: string) => void
  width?: number | string
}

export default function ColPicker({ columns, value, onChange, width = 160 }: ColPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [hlIdx, setHlIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setHlIdx(0)
    setTimeout(() => inputRef.current?.focus(), 0)
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  const selected = columns.find(c => c.data === value)

  // Relevance sort: title startsWith first, then includes
  const filtered = (() => {
    if (!search) return columns
    const q = search.toLowerCase()
    const starts: typeof columns = []
    const rest: typeof columns = []
    for (const c of columns) {
      const t = c.title.toLowerCase()
      if (t.startsWith(q)) starts.push(c)
      else if (t.includes(q)) rest.push(c)
    }
    return [...starts, ...rest]
  })()

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[hlIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [hlIdx])

  const selectItem = (dataKey: string) => {
    onChange(dataKey)
    setOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHlIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHlIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[hlIdx]) selectItem(filtered[hlIdx].data)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          width: '100%', height: 36, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '0 10px', fontSize: 13, background: 'white', color: '#111827',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 4,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.title ?? value}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 2000,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setHlIdx(0) }}
              onKeyDown={handleKeyDown}
              placeholder="컬럼 검색..."
              style={{
                width: '100%', height: 30, border: '1px solid #E2E8F0', borderRadius: 4,
                padding: '0 8px', fontSize: 13, outline: 'none', color: '#111827', boxSizing: 'border-box',
              }}
            />
          </div>
          <div ref={listRef} style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 13, color: '#9CA3AF' }}>결과 없음</div>
            ) : filtered.map((c, i) => (
              <div
                key={c.data}
                onMouseDown={() => selectItem(c.data)}
                onMouseEnter={() => setHlIdx(i)}
                style={{
                  padding: '7px 12px', fontSize: 13,
                  color: c.data === value ? '#2D7FF9' : '#111827',
                  background: i === hlIdx ? '#F0F4FF' : c.data === value ? '#EFF6FF' : 'white',
                  cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {c.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
