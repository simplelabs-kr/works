'use client'

import { useEffect, useRef } from 'react'

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
        minWidth: 380, maxWidth: '90vw',
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

            <select
              style={{ ...selectStyle, flex: 1 }}
              value={cond.column}
              onChange={e => onChange(conditions.map(c => c.id === cond.id ? { ...c, column: e.target.value } : c))}
            >
              {filteredCols.map(c => (
                <option key={c.title} value={c.title}>{c.title}</option>
              ))}
            </select>

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
