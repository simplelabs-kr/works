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
  column: string
  operator: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}

export interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  conditions: FilterCondition[]
}

export interface RootFilterState {
  logic: 'AND' | 'OR'
  conditions: (FilterCondition | FilterGroup)[]
}

export function isFilterGroup(item: FilterCondition | FilterGroup): item is FilterGroup {
  return 'conditions' in item && Array.isArray((item as FilterGroup).conditions)
}

export function countAllConditions(state: RootFilterState): number {
  let n = 0
  for (const item of state.conditions) {
    if (isFilterGroup(item)) n += item.conditions.length
    else n += 1
  }
  return n
}

// ── Operator definitions ───────────────────────────────────────────────────────

function getOpsForFieldType(fieldType: string): { value: string; label: string }[] {
  switch (fieldType) {
    case 'image':
    case 'attachment':
      return [
        { value: 'is_empty', label: '비어있음' },
        { value: 'is_not_empty', label: '비어있지 않음' },
      ]
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

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ── SelectValuePicker ───────────────────────────────────────────────────────

function SelectValuePicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])
  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', height: 32, border: '1px solid #D1D5DB', borderRadius: 6,
        padding: '0 10px', fontSize: 12, background: 'white', color: value ? '#111827' : '#9CA3AF',
        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '선택...'}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 2100, background: 'white', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%', maxHeight: 200, overflowY: 'auto' }}>
          {options.map(opt => (
            <div key={opt} onMouseDown={() => { onChange(opt); setOpen(false) }} style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: opt === value ? '#2D7FF9' : '#111827', background: opt === value ? '#EFF6FF' : 'white' }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = opt === value ? '#EFF6FF' : 'white' }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MultiSelectPicker ───────────────────────────────────────────────────────

function MultiSelectPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', height: 32, border: '1px solid #D1D5DB', borderRadius: 6,
        padding: '0 10px', fontSize: 12, background: 'white', color: value.length > 0 ? '#111827' : '#9CA3AF',
        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.length > 0 ? `${value.length}개 선택됨` : '선택...'}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 2100, background: 'white', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%', maxHeight: 220, overflowY: 'auto' }}>
          {options.map(opt => (
            <label key={opt} onMouseDown={e => e.preventDefault()} onClick={() => toggle(opt)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', userSelect: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.background = '#F8FAFC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.background = 'white' }}
            >
              <input type="checkbox" checked={value.includes(opt)} readOnly style={{ accentColor: '#2D7FF9', width: 14, height: 14, cursor: 'pointer' }} />{opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ConditionRow ─────────────────────────────────────────────────────────────

function ConditionRow({ cond, filteredCols, selectOptions, onUpdate, onRemove }: {
  cond: FilterCondition
  filteredCols: FilterColDef[]
  selectOptions: Record<string, string[]>
  onUpdate: (patch: Partial<FilterCondition>) => void
  onRemove: () => void
}) {
  const col = filteredCols.find(c => c.title === cond.column) ?? filteredCols[0]
  const ft = col ? resolveFieldType(col) : 'text'
  const ops = getOpsForFieldType(ft)
  const showValue = needsValueInput(cond.operator)
  const isDate = ft === 'date'
  const isSelect = ft === 'select'
  const isMulti = isMultiOp(cond.operator)
  const opts = isSelect ? (selectOptions[col?.data ?? ''] ?? []) : []

  const ss: React.CSSProperties = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 8px', fontSize: 12, background: 'white', cursor: 'pointer', outline: 'none', color: '#111827', height: 32 }
  const is: React.CSSProperties = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none', color: '#111827', height: 32, minWidth: 100, flex: 1 }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 32 }}>
      <ColPicker columns={filteredCols} value={cond.column} width={140} onChange={key => onUpdate({ column: key })} />
      <select style={{ ...ss, width: 120 }} value={cond.operator} onChange={e => onUpdate({ operator: e.target.value })}>
        {ops.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>
      {showValue && isSelect && isMulti && opts.length > 0 && (
        <MultiSelectPicker options={opts} value={Array.isArray(cond.value) ? cond.value : []} onChange={v => onUpdate({ value: v })} />
      )}
      {showValue && isSelect && !isMulti && opts.length > 0 && (
        <SelectValuePicker options={opts} value={typeof cond.value === 'string' ? cond.value : ''} onChange={v => onUpdate({ value: v })} />
      )}
      {showValue && !isSelect && (
        <input style={is} type={isDate ? 'date' : 'text'} value={typeof cond.value === 'string' ? cond.value : ''} onChange={e => onUpdate({ value: e.target.value })} placeholder="값 입력..." />
      )}
      <button onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

interface FilterModalProps {
  columns: FilterColDef[]
  filterState: RootFilterState
  selectOptions?: Record<string, string[]>
  onChange: (state: RootFilterState) => void
  onApply: () => void
  onClose: () => void
}

export default function FilterModal({ columns, filterState, selectOptions = {}, onChange, onApply, onClose }: FilterModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!modalRef.current?.contains(e.target as Node)) onClose() }
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

  const makeCondition = (): FilterCondition => {
    const firstCol = filteredCols[0]
    const ft = firstCol ? resolveFieldType(firstCol) : 'text'
    const ops = getOpsForFieldType(ft)
    return { id: uid(), column: firstCol?.title ?? '', operator: ops[0]?.value ?? 'contains', value: null }
  }

  const updateItem = (id: string, patch: Partial<FilterCondition>) => {
    onChange({
      ...filterState,
      conditions: filterState.conditions.map(item => {
        if (!isFilterGroup(item) && item.id === id) {
          const next = { ...item, ...patch }
          if (patch.column && patch.column !== item.column) {
            const col = filteredCols.find(c => c.title === patch.column)
            if (col) { const ft = resolveFieldType(col); const ops = getOpsForFieldType(ft); next.operator = ops[0]?.value ?? 'contains'; next.value = null }
          }
          if (patch.operator) {
            if (!needsValueInput(patch.operator)) next.value = null
            else if (isMultiOp(patch.operator) && !Array.isArray(next.value)) next.value = []
            else if (!isMultiOp(patch.operator) && Array.isArray(next.value)) next.value = null
          }
          return next
        }
        return item
      }),
    })
  }

  const updateGroupCondition = (groupId: string, condId: string, patch: Partial<FilterCondition>) => {
    onChange({
      ...filterState,
      conditions: filterState.conditions.map(item => {
        if (isFilterGroup(item) && item.id === groupId) {
          return {
            ...item,
            conditions: item.conditions.map(c => {
              if (c.id !== condId) return c
              const next = { ...c, ...patch }
              if (patch.column && patch.column !== c.column) {
                const col = filteredCols.find(fc => fc.title === patch.column)
                if (col) { const ft = resolveFieldType(col); const ops = getOpsForFieldType(ft); next.operator = ops[0]?.value ?? 'contains'; next.value = null }
              }
              if (patch.operator) {
                if (!needsValueInput(patch.operator)) next.value = null
                else if (isMultiOp(patch.operator) && !Array.isArray(next.value)) next.value = []
                else if (!isMultiOp(patch.operator) && Array.isArray(next.value)) next.value = null
              }
              return next
            }),
          }
        }
        return item
      }),
    })
  }

  const removeItem = (id: string) => {
    onChange({ ...filterState, conditions: filterState.conditions.filter(item => item.id !== id) })
  }

  const removeGroupCondition = (groupId: string, condId: string) => {
    onChange({
      ...filterState,
      conditions: filterState.conditions.map(item => {
        if (isFilterGroup(item) && item.id === groupId) {
          const next = item.conditions.filter(c => c.id !== condId)
          if (next.length === 0) return null as unknown as FilterCondition | FilterGroup
          return { ...item, conditions: next }
        }
        return item
      }).filter(Boolean),
    })
  }

  const addCondition = () => {
    onChange({ ...filterState, conditions: [...filterState.conditions, makeCondition()] })
  }

  const addGroup = () => {
    const group: FilterGroup = { id: uid(), logic: 'OR', conditions: [makeCondition()] }
    onChange({ ...filterState, conditions: [...filterState.conditions, group] })
  }

  const addGroupCondition = (groupId: string) => {
    onChange({
      ...filterState,
      conditions: filterState.conditions.map(item => {
        if (isFilterGroup(item) && item.id === groupId) {
          return { ...item, conditions: [...item.conditions, makeCondition()] }
        }
        return item
      }),
    })
  }

  const setGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    onChange({
      ...filterState,
      conditions: filterState.conditions.map(item => {
        if (isFilterGroup(item) && item.id === groupId) return { ...item, logic }
        return item
      }),
    })
  }

  const logicStyle: React.CSSProperties = {
    border: '1px solid #D1D5DB', borderRadius: 6, padding: '0 8px',
    fontSize: 12, background: 'white', cursor: 'pointer', outline: 'none',
    color: '#111827', height: 28,
  }

  return (
    <div ref={modalRef} style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
      boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: '16px 18px',
      minWidth: 520, maxWidth: 'calc(100vw - 16px)',
    }}>
      {/* Header + root logic */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>필터</span>
        <select style={logicStyle} value={filterState.logic} onChange={e => onChange({ ...filterState, logic: e.target.value as 'AND' | 'OR' })}>
          <option value="AND">모든 조건 일치 (AND)</option>
          <option value="OR">하나라도 일치 (OR)</option>
        </select>
      </div>

      {filterState.conditions.length === 0 && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14 }}>필터 조건이 없습니다.</div>
      )}

      {/* Conditions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {filterState.conditions.map(item => {
          if (isFilterGroup(item)) {
            return (
              <div key={item.id} style={{
                background: '#F8FAFC', borderRadius: 8, padding: '10px 12px',
                borderLeft: '3px solid #3B82F6', position: 'relative',
              }}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>그룹</span>
                  <select style={{ ...logicStyle, height: 24, fontSize: 11 }} value={item.logic} onChange={e => setGroupLogic(item.id, e.target.value as 'AND' | 'OR')}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => removeItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
                {/* Group conditions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {item.conditions.map(cond => (
                    <ConditionRow
                      key={cond.id}
                      cond={cond}
                      filteredCols={filteredCols}
                      selectOptions={selectOptions}
                      onUpdate={patch => updateGroupCondition(item.id, cond.id, patch)}
                      onRemove={() => removeGroupCondition(item.id, cond.id)}
                    />
                  ))}
                </div>
                <button onClick={() => addGroupCondition(item.id)} style={{ fontSize: 12, color: '#3B82F6', border: 'none', background: 'none', cursor: 'pointer', marginTop: 6 }}>+ 조건 추가</button>
              </div>
            )
          }
          return (
            <ConditionRow
              key={item.id}
              cond={item}
              filteredCols={filteredCols}
              selectOptions={selectOptions}
              onUpdate={patch => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          )
        })}
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={addCondition} style={{ fontSize: 12, color: '#2D7FF9', border: 'none', background: 'none', cursor: 'pointer' }}>+ 조건 추가</button>
        <button onClick={addGroup} style={{ fontSize: 12, color: '#3B82F6', border: 'none', background: 'none', cursor: 'pointer' }}>+ 그룹 추가</button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
        <button onClick={() => { onChange({ logic: 'AND', conditions: [] }); onApply() }} style={{ fontSize: 13, color: '#6B7280', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', background: 'white' }}>초기화</button>
        <button onClick={() => { onApply(); onClose() }} style={{ fontSize: 13, color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', background: '#2D7FF9' }}>적용</button>
      </div>
    </div>
  )
}
