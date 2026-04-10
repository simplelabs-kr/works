'use client'

import { useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SortColDef {
  data: string
  title: string
}

export interface SortCondition {
  id: string
  columnKey: string
  direction: 'asc' | 'desc'
}

// ── Component ──────────────────────────────────────────────────────────────────

interface SortModalProps {
  columns: SortColDef[]
  conditions: SortCondition[]
  anchorRect: DOMRect | null
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
  anchorRect,
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

  const filteredCols = columns.filter(c => typeof c.data === 'string' && c.data !== '')

  const addCondition = () => {
    const firstCol = filteredCols[0]
    if (!firstCol) return
    onChange([...conditions, { id: uid(), columnKey: firstCol.data, direction: 'asc' }])
  }

  const top = anchorRect ? anchorRect.bottom + 4 : 60
  const left = anchorRect ? anchorRect.left : 12

  const dropdownStyle: React.CSSProperties = {
    border: '1px solid #E2E8F0',
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 13,
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    color: '#111827',
  }

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: 16,
        minWidth: 380,
        maxWidth: '90vw',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>정렬</div>

      {conditions.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>정렬 조건이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {conditions.map((cond, i) => (
          <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', width: 20, textAlign: 'right', flexShrink: 0 }}>
              {i === 0 ? '기준' : `다음`}
            </span>

            <select
              style={{ ...dropdownStyle, flex: 1 }}
              value={cond.columnKey}
              onChange={e => onChange(conditions.map(c => c.id === cond.id ? { ...c, columnKey: e.target.value } : c))}
            >
              {filteredCols.map(c => (
                <option key={c.data} value={c.data}>{c.title}</option>
              ))}
            </select>

            <select
              style={{ ...dropdownStyle, width: 90 }}
              value={cond.direction}
              onChange={e => onChange(conditions.map(c => c.id === cond.id ? { ...c, direction: e.target.value as 'asc' | 'desc' } : c))}
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>

            <button
              onClick={() => onChange(conditions.filter(c => c.id !== cond.id))}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>
        ))}
      </div>

      <button
        onClick={addCondition}
        style={{ fontSize: 13, color: '#2D7FF9', border: 'none', background: 'none', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}
      >
        + 정렬 추가
      </button>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
        <button
          onClick={() => { onChange([]); onApply() }}
          style={{ fontSize: 13, color: '#6B7280', border: '1px solid #E2E8F0', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', background: 'white' }}
        >
          초기화
        </button>
        <button
          onClick={() => { onApply(); onClose() }}
          style={{ fontSize: 13, color: 'white', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', background: '#2D7FF9' }}
        >
          적용
        </button>
      </div>
    </div>
  )
}
