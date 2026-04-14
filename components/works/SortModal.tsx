'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SortColDef {
  data: string
  title: string
}

export interface SortCondition {
  id: string
  column: string
  direction: 'asc' | 'desc'
}

// ── ColPicker: custom dropdown with inline search ─────────────────────────────

interface ColPickerProps {
  columns: SortColDef[]
  value: string
  onChange: (key: string) => void
}

function ColPicker({ columns, value, onChange }: ColPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 0)
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  const selected = columns.find(c => c.title === value)
  const filtered = search
    ? columns.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : columns

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
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
              onChange={e => setSearch(e.target.value)}
              placeholder="컬럼 검색..."
              style={{
                width: '100%', height: 30, border: '1px solid #E2E8F0', borderRadius: 4,
                padding: '0 8px', fontSize: 13, outline: 'none', color: '#111827', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 13, color: '#9CA3AF' }}>결과 없음</div>
            ) : filtered.map(c => (
              <div
                key={c.title}
                onMouseDown={() => { onChange(c.title); setOpen(false); setSearch('') }}
                style={{
                  padding: '7px 12px', fontSize: 13,
                  color: c.title === value ? '#2D7FF9' : '#111827',
                  background: c.title === value ? '#EFF6FF' : 'white',
                  cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                onMouseEnter={e => { if (c.title !== value) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = c.title === value ? '#EFF6FF' : 'white' }}
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

// ── Component ──────────────────────────────────────────────────────────────────

interface SortModalProps {
  columns: SortColDef[]
  conditions: SortCondition[]
  onChange: (conditions: SortCondition[]) => void
  onApply: () => void
  onClose: () => void
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function SortModal({
  columns,
  conditions,
  onChange,
  onApply,
  onClose,
}: SortModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!modalRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [onClose])

  const filteredCols = columns.filter(c => typeof c.title === 'string' && c.title !== '')

  const addCondition = () => {
    const firstCol = filteredCols[0]
    if (!firstCol) return
    onChange([...conditions, { id: uid(), column: firstCol.title, direction: 'asc' }])
  }

  const selectStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 8px',
    fontSize: 13, background: 'white', cursor: 'pointer', outline: 'none',
    color: '#111827', height: 36,
  }

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed', top: 60, left: 12, zIndex: 1000,
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: '18px 20px',
        minWidth: 420, maxWidth: '90vw',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>정렬</div>

      {conditions.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>정렬 조건이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {conditions.map((cond, i) => (
          <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
            <span style={{ fontSize: 13, color: '#6B7280', width: 32, textAlign: 'right', flexShrink: 0 }}>
              {i === 0 ? '기준' : '다음'}
            </span>

            <ColPicker
              columns={filteredCols}
              value={cond.column}
              onChange={col => onChange(conditions.map(c => c.id === cond.id ? { ...c, column: col } : c))}
            />

            <select
              style={{ ...selectStyle, width: 100 }}
              value={cond.direction}
              onChange={e => onChange(conditions.map(c => c.id === cond.id ? { ...c, direction: e.target.value as 'asc' | 'desc' } : c))}
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>

            <button
              onClick={() => onChange(conditions.filter(c => c.id !== cond.id))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
            >×</button>
          </div>
        ))}
      </div>

      <button
        onClick={addCondition}
        style={{ fontSize: 13, color: '#2D7FF9', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0 16px', display: 'block' }}
      >
        + 정렬 추가
      </button>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
        <button
          onClick={() => { onChange([]); onApply() }}
          style={{ fontSize: 13, color: '#6B7280', border: '1px solid #E2E8F0', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', background: 'white' }}
        >
          초기화
        </button>
        <button
          onClick={() => { onApply(); onClose() }}
          style={{ fontSize: 13, color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', background: '#2D7FF9' }}
        >
          적용
        </button>
      </div>
    </div>
  )
}
