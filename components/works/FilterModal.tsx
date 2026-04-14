'use client'

import { useEffect, useRef, useState } from 'react'
import ColPicker from './ColPicker'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FilterColDef {
  data: string
  title: string
  fieldType?: string
  outputType?: 'text' | 'number' | 'date'
}

export interface FilterCondition {
  id: string
  logic: 'AND' | 'OR'
  column: string
  operator: string
  value: string | string[] | null
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
        { value: 'is_any_of', label: '다음 중 포함' },
        { value: 'is_none_of', label: '다음 중 포함안함' },
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
  if (col.fieldType === 'formula') return col.outputType || 'text'
  return col.fieldType || 'text'
}

function needsValueInput(operator: string): boolean {
  return ![
    'is_empty', 'is_not_empty', 'is_checked', 'is_unchecked',
    'is_today', 'is_yesterday', 'is_this_week', 'is_last_week',
    'is_this_month', 'is_last_month',
  ].includes(operator)
}

function isMultiOp(operator: string): boolean {
  return operator === 'is_any_of' || operator === 'is_none_of'
}

// ── SelectValuePicker (single select dropdown) ──────────────────────────────

function SelectValuePicker({ options, value, onChange }: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 36, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '0 10px', fontSize: 13, background: 'white', color: value ? '#111827' : '#9CA3AF',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '선택...'}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 2100,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%', maxHeight: 200, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false) }}
              style={{
                padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                color: opt === value ? '#2D7FF9' : '#111827',
                background: opt === value ? '#EFF6FF' : 'white',
              }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = opt === value ? '#EFF6FF' : 'white' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MultiSelectPicker (checkbox list) ───────────────────────────────────────

function MultiSelectPicker({ options, value, onChange }: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 36, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '0 10px', fontSize: 13, background: 'white',
          color: value.length > 0 ? '#111827' : '#9CA3AF',
          cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value.length > 0 ? `${value.length}개 선택됨` : '선택...'}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 2100,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%', maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <label
              key={opt}
              onMouseDown={e => e.preventDefault()}
              onClick={() => toggle(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                fontSize: 13, cursor: 'pointer', userSelect: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.background = '#F8FAFC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.background = 'white' }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt)}
                readOnly
                style={{ accentColor: '#2D7FF9', width: 14, height: 14, cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface FilterModalProps {
  columns: FilterColDef[]
  conditions: FilterCondition[]
  selectOptions?: Record<string, string[]>
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
  selectOptions = {},
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { onApply(); onClose() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onApply, onClose])

  const filteredCols = columns.filter(c =>
    typeof c.title === 'string' && c.title !== '' &&
    (c.fieldType !== 'formula' || c.outputType != null)
  )

  const addCondition = () => {
    const firstCol = filteredCols[0]
    if (!firstCol) return
    const ft = resolveFieldType(firstCol)
    const ops = getOpsForFieldType(ft)
    onChange([...conditions, {
      id: uid(),
      logic: 'AND',
      column: firstCol.title,
      operator: ops[0]?.value ?? 'contains',
      value: null,
    }])
  }

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange(conditions.map(c => {
      if (c.id !== id) return c
      const next = { ...c, ...patch }
      if (patch.column && patch.column !== c.column) {
        const col = filteredCols.find(fc => fc.title === patch.column)
        if (col) {
          const ft = resolveFieldType(col)
          const ops = getOpsForFieldType(ft)
          next.operator = ops[0]?.value ?? 'contains'
          next.value = null
        }
      }
      if (patch.operator) {
        if (!needsValueInput(patch.operator)) {
          next.value = null
        } else if (isMultiOp(patch.operator) && !Array.isArray(next.value)) {
          next.value = []
        } else if (!isMultiOp(patch.operator) && Array.isArray(next.value)) {
          next.value = null
        }
      }
      return next
    }))
  }

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id))
  }

  // Find select options for a column by matching column title → COLUMNS data key → selectOptions
  const getSelectOpts = (colTitle: string): string[] => {
    const col = filteredCols.find(c => c.title === colTitle)
    if (!col) return []
    return selectOptions[col.data] ?? []
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
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: '18px 20px',
        minWidth: 480, maxWidth: 'calc(100vw - 16px)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>필터</div>

      {conditions.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>필터 조건이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {conditions.map((cond, i) => {
          const col = filteredCols.find(c => c.title === cond.column) ?? filteredCols[0]
          const ft = col ? resolveFieldType(col) : 'text'
          const ops = getOpsForFieldType(ft)
          const showValue = needsValueInput(cond.operator)
          const isDate = ft === 'date'
          const isSelect = ft === 'select'
          const isMulti = isMultiOp(cond.operator)
          const opts = isSelect ? getSelectOpts(cond.column) : []

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
              {showValue && isSelect && isMulti && opts.length > 0 && (
                <MultiSelectPicker
                  options={opts}
                  value={Array.isArray(cond.value) ? cond.value : []}
                  onChange={v => updateCondition(cond.id, { value: v })}
                />
              )}
              {showValue && isSelect && !isMulti && opts.length > 0 && (
                <SelectValuePicker
                  options={opts}
                  value={typeof cond.value === 'string' ? cond.value : ''}
                  onChange={v => updateCondition(cond.id, { value: v })}
                />
              )}
              {showValue && !isSelect && (
                <input
                  style={inputStyle}
                  type={isDate ? 'date' : 'text'}
                  value={typeof cond.value === 'string' ? cond.value : ''}
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
