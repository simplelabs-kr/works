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
  columnKey: string
  operator: string
  value: string | boolean | null
}

// ── Operator definitions ───────────────────────────────────────────────────────

const NUMERIC_KEYS = new Set([
  'metals.purity', '시세_g당', '소재비', '기본_공임', '공임_조정액', '확정_공임',
  '발주_수량', '순금_중량', '수량', '주물_후_수량', '중량',
])

const DATE_KEYS = new Set(['발주일', '생산시작일', '데드라인', '출고예정일'])

function getOpsForCol(col: FilterColDef): { value: string; label: string }[] {
  const ft = col.fieldType ?? ''
  if (ft === 'checkbox') return [
    { value: 'is_checked', label: '체크됨' },
    { value: 'is_unchecked', label: '체크 안 됨' },
  ]
  if (ft === 'select') return [
    { value: 'is', label: '이다' },
    { value: 'is_not', label: '아니다' },
    { value: 'is_empty', label: '비어 있음' },
    { value: 'is_not_empty', label: '비어 있지 않음' },
  ]
  if (ft === 'date' || DATE_KEYS.has(col.data)) return [
    { value: 'is', label: '날짜가' },
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
    { value: 'is_empty', label: '비어 있음' },
    { value: 'is_not_empty', label: '비어 있지 않음' },
  ]
  if (ft === 'number' || NUMERIC_KEYS.has(col.data)) return [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'is_empty', label: '비어 있음' },
    { value: 'is_not_empty', label: '비어 있지 않음' },
  ]
  return [
    { value: 'contains', label: '포함' },
    { value: 'not_contains', label: '포함 안 함' },
    { value: 'is', label: '정확히 일치' },
    { value: 'is_not', label: '일치하지 않음' },
    { value: 'is_empty', label: '비어 있음' },
    { value: 'is_not_empty', label: '비어 있지 않음' },
  ]
}

function needsValueInput(operator: string): boolean {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked',
    'is_today', 'is_yesterday', 'is_this_week', 'is_last_week',
    'is_this_month', 'is_last_month'].includes(operator)
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
    <div ref={wrapRef} style={{ position: 'relative', width: 170 }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          width: '100%',
          height: 36,
          border: '1px solid #D1D5DB',
          borderRadius: 6,
          padding: '0 10px',
          fontSize: 14,
          background: 'white',
          color: '#111827',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.title ?? value}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 2000,
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          width: 220,
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="컬럼 검색..."
              style={{
                width: '100%',
                height: 30,
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '0 8px',
                fontSize: 13,
                outline: 'none',
                color: '#111827',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 13, color: '#9CA3AF' }}>결과 없음</div>
            ) : filtered.map(c => (
              <div
                key={c.data}
                onMouseDown={() => { onChange(c.data); setOpen(false); setSearch('') }}
                style={{
                  padding: '7px 12px',
                  fontSize: 14,
                  color: c.data === value ? '#2D7FF9' : '#111827',
                  background: c.data === value ? '#EFF6FF' : 'white',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
  anchorRect: DOMRect | null
  onChange: (conditions: FilterCondition[]) => void
  onApply: () => void
  onClose: () => void
  selectOptions: Record<string, string[]>
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function FilterModal({
  columns,
  conditions,
  anchorRect,
  onChange,
  onApply,
  onClose,
  selectOptions,
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
    const ops = getOpsForCol(firstCol)
    onChange([...conditions, {
      id: uid(),
      logic: 'AND',
      columnKey: firstCol.data,
      operator: ops[0]?.value ?? 'contains',
      value: null,
    }])
  }

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange(conditions.map(c => {
      if (c.id !== id) return c
      const next = { ...c, ...patch }
      if (patch.columnKey && patch.columnKey !== c.columnKey) {
        const col = filteredCols.find(fc => fc.data === patch.columnKey)
        if (col) {
          const ops = getOpsForCol(col)
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

  const top = anchorRect ? anchorRect.bottom + 4 : 60
  const left = anchorRect ? anchorRect.left : 12

  const selectStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 14,
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    color: '#111827',
    height: 36,
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 14,
    outline: 'none',
    color: '#111827',
    height: 36,
    minWidth: 140,
    flex: 1,
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
        borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
        padding: '18px 20px',
        minWidth: 640,
        maxWidth: '90vw',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>필터</div>

      {conditions.length === 0 && (
        <div style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 14 }}>필터 조건이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {conditions.map((cond, i) => {
          const col = filteredCols.find(c => c.data === cond.columnKey) ?? filteredCols[0]
          const ops = col ? getOpsForCol(col) : []
          const showValue = needsValueInput(cond.operator)
          const isSelect = col?.fieldType === 'select'
          const opts = isSelect ? (selectOptions[cond.columnKey] ?? []) : []

          return (
            <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Logic */}
              {i === 0 ? (
                <span style={{ fontSize: 13, color: '#6B7280', width: 72, textAlign: 'center', flexShrink: 0 }}>조건</span>
              ) : (
                <select
                  style={{ ...selectStyle, width: 80, flexShrink: 0 }}
                  value={cond.logic}
                  onChange={e => updateCondition(cond.id, { logic: e.target.value as 'AND' | 'OR' })}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}

              {/* Column — custom picker with inline search */}
              <ColPicker
                columns={filteredCols}
                value={cond.columnKey}
                onChange={key => updateCondition(cond.id, { columnKey: key })}
              />

              {/* Operator */}
              <select
                style={{ ...selectStyle, width: 148 }}
                value={cond.operator}
                onChange={e => updateCondition(cond.id, { operator: e.target.value })}
              >
                {ops.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value */}
              {showValue && (
                isSelect && opts.length > 0 ? (
                  <select
                    style={{ ...selectStyle, flex: 1, minWidth: 120 }}
                    value={String(cond.value ?? '')}
                    onChange={e => updateCondition(cond.id, { value: e.target.value })}
                  >
                    <option value="">선택...</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    style={inputStyle}
                    type={col && (col.fieldType === 'date' || DATE_KEYS.has(col.data)) ? 'date' : 'text'}
                    value={String(cond.value ?? '')}
                    onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    placeholder="값 입력..."
                  />
                )
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
        style={{ fontSize: 14, color: '#2D7FF9', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0 16px', display: 'block' }}
      >
        + 조건 추가
      </button>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
        <button
          onClick={() => { onChange([]); onApply() }}
          style={{ fontSize: 14, color: '#6B7280', border: '1px solid #E2E8F0', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', background: 'white' }}
        >
          초기화
        </button>
        <button
          onClick={() => { onApply(); onClose() }}
          style={{ fontSize: 14, color: 'white', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', background: '#2D7FF9' }}
        >
          적용
        </button>
      </div>
    </div>
  )
}
