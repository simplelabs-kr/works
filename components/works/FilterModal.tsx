'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FilterColDef {
  data: string
  title: string
  fieldType?: string
}

export interface FilterCondition {
  id: string
  logic: 'AND' | 'OR'
  column: string
  operator: string
  value: string | null
}

// ── Operator definitions ───────────────────────────────────────────────────────

function getOpsForFieldType(fieldType: string): { value: string; label: string }[] {
  switch (fieldType) {
    case 'checkbox':
      return [
        { value: 'is_checked', label: '체크됨' },
        { value: 'is_unchecked', label: '체크 안 됨' },
      ]
    case 'select':
      return [
        { value: 'is', label: '같음' },
        { value: 'is_not', label: '다름' },
        { value: 'is_empty', label: '비어있음' },
        { value: 'is_not_empty', label: '비어있지 않음' },
      ]
    case 'date':
      return [
        { value: 'is_before', label: '이전' },
        { value: 'is_after', label: '이후' },
        { value: 'is_on_or_before', label: '이전 또는 같음' },
        { value: 'is_on_or_after', label: '이후 또는 같음' },
        { value: 'is_today', label: '오늘' },
        { value: 'is_yesterday', label: '어제' },
        { value: 'is_this_week', label: '이번 주' },
        { value: 'is_last_week', label: '지난 주' },
        { value: 'is_this_month', label: '이번 달' },
        { value: 'is_last_month', label: '지난 달' },
        { value: 'is_empty', label: '비어있음' },
        { value: 'is_not_empty', label: '비어있지 않음' },
      ]
    case 'number':
      return [
        { value: 'eq', label: '=' },
        { value: 'neq', label: '≠' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '≥' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '≤' },
        { value: 'is_empty', label: '비어있음' },
        { value: 'is_not_empty', label: '비어있지 않음' },
      ]
    default:
      // text, longtext, lookup, formula, readOnly text
      return [
        { value: 'contains', label: '포함' },
        { value: 'not_contains', label: '포함 안 함' },
        { value: 'is', label: '같음' },
        { value: 'is_not', label: '다름' },
        { value: 'is_empty', label: '비어있음' },
        { value: 'is_not_empty', label: '비어있지 않음' },
      ]
  }
}

function resolveFieldType(col: FilterColDef): string {
  const ft = col.fieldType ?? ''
  if (ft === 'lookup' || ft === 'formula') return 'text'
  return ft || 'text'
}

function needsValueInput(operator: string): boolean {
  return ![
    'is_empty', 'is_not_empty', 'is_checked', 'is_unchecked',
    'is_today', 'is_yesterday', 'is_this_week', 'is_last_week',
    'is_this_month', 'is_last_month',
  ].includes(operator)
}

// ── ColPicker: custom dropdown with inline search ─────────────────────────────

interface ColPickerProps {
  columns: FilterColDef[]
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

  const selected = columns.find(c => c.data === value)
  const filtered = search
    ? columns.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : columns

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: 160 }}>
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
                key={c.data}
                onMouseDown={() => { onChange(c.data); setOpen(false); setSearch('') }}
                style={{
                  padding: '7px 12px', fontSize: 13,
                  color: c.data === value ? '#2D7FF9' : '#111827',
                  background: c.data === value ? '#EFF6FF' : 'white',
                  cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                onMouseEnter={e => { if (c.data !== value) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = c.data === value ? '#EFF6FF' : 'white' }}
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

interface FilterModalProps {
  columns: FilterColDef[]
  conditions: FilterCondition[]
  onChange: (conditions: FilterCondition[]) => void
  onApply: () => void
  onClose: () => void
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function FilterModal({
  columns,
  conditions,
  onChange,
  onApply,
  onClose,
}: FilterModalProps) {
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
    const ft = resolveFieldType(firstCol)
    const ops = getOpsForFieldType(ft)
    onChange([...conditions, {
      id: uid(),
      logic: 'AND',
      column: firstCol.data,
      operator: ops[0]?.value ?? 'contains',
      value: null,
    }])
  }

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange(conditions.map(c => {
      if (c.id !== id) return c
      const next = { ...c, ...patch }
      if (patch.column && patch.column !== c.column) {
        const col = filteredCols.find(fc => fc.data === patch.column)
        if (col) {
          const ft = resolveFieldType(col)
          const ops = getOpsForFieldType(ft)
          next.operator = ops[0]?.value ?? 'contains'
          next.value = null
        }
      }
      if (patch.operator && !needsValueInput(patch.operator)) {
        next.value = null
      }
      return next
    }))
  }

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id))
  }

  const selectStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 10px',
    fontSize: 13, background: 'white', cursor: 'pointer', outline: 'none',
    color: '#111827', height: 36,
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 10px',
    fontSize: 13, outline: 'none', color: '#111827', height: 36, minWidth: 120, flex: 1,
  }

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed', top: 60, left: 12, zIndex: 1000,
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: '18px 20px',
        minWidth: 520, maxWidth: '90vw',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>필터</div>

      {conditions.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>필터 조건이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {conditions.map((cond, i) => {
          const col = filteredCols.find(c => c.data === cond.column) ?? filteredCols[0]
          const ft = col ? resolveFieldType(col) : 'text'
          const ops = getOpsForFieldType(ft)
          const showValue = needsValueInput(cond.operator)
          const isDate = ft === 'date'

          return (
            <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
              {/* Logic */}
              {i === 0 ? (
                <span style={{ fontSize: 13, color: '#6B7280', width: 72, textAlign: 'center', flexShrink: 0 }}>조건</span>
              ) : (
                <select
                  style={{ ...selectStyle, width: 72, flexShrink: 0 }}
                  value={cond.logic}
                  onChange={e => updateCondition(cond.id, { logic: e.target.value as 'AND' | 'OR' })}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}

              {/* Column */}
              <ColPicker
                columns={filteredCols}
                value={cond.column}
                onChange={key => updateCondition(cond.id, { column: key })}
              />

              {/* Operator */}
              <select
                style={{ ...selectStyle, width: 140 }}
                value={cond.operator}
                onChange={e => updateCondition(cond.id, { operator: e.target.value })}
              >
                {ops.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value */}
              {showValue && (
                <input
                  style={inputStyle}
                  type={isDate ? 'date' : 'text'}
                  value={cond.value ?? ''}
                  onChange={e => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="값 입력..."
                />
              )}

              {/* Remove */}
              <button
                onClick={() => removeCondition(cond.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          )
        })}
      </div>

      <button
        onClick={addCondition}
        style={{ fontSize: 13, color: '#2D7FF9', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0 16px', display: 'block' }}
      >
        + 조건 추가
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
