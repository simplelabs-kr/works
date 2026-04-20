'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SummaryColDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: string | ((...args: any[]) => string)
  title: string
  width: number
  fieldType?: string
}

type Op = 'none' | 'sum' | 'average' | 'min' | 'max' | 'count' | 'empty' | 'filled' | 'checked' | 'unchecked'

// ── Constants ─────────────────────────────────────────────────────────────────

const OPS_FOR_TYPE: Record<string, Op[]> = {
  number:   ['none', 'sum', 'average', 'min', 'max', 'count'],
  checkbox: ['none', 'checked', 'unchecked'],
}
const OPS_DEFAULT: Op[] = ['none', 'count', 'empty', 'filled']

// Lookup/formula columns whose values are numeric
const NUMERIC_LOOKUP_KEYS = new Set([
  'metal_purity', '시세_g당', '소재비', '기본_공임', '공임_조정액', '확정_공임',
  '발주_수량', '순금_중량', '기준_중량',
])

const OP_LABELS: Record<Op, string> = {
  none:     'None',
  sum:      'Sum',
  average:  'Avg',
  min:      'Min',
  max:      'Max',
  count:    'Count',
  empty:    'Empty',
  filled:   'Filled',
  checked:  'Checked',
  unchecked:'Unchecked',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVal(row: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], row)
}

function calcSummary(op: Op, rows: Record<string, unknown>[], dataKey: string): string {
  if (op === 'none' || rows.length === 0) return ''
  const vals = rows.map(r => getVal(r, dataKey))
  const nonEmpty = vals.filter(v => v !== null && v !== undefined && v !== '')

  switch (op) {
    case 'count':    return nonEmpty.length.toLocaleString()
    case 'empty':    return (vals.length - nonEmpty.length).toLocaleString()
    case 'filled':   return nonEmpty.length.toLocaleString()
    case 'checked':  return vals.filter(v => v === true).length.toLocaleString()
    case 'unchecked':return vals.filter(v => v !== true).length.toLocaleString()
    case 'sum': {
      const nums = nonEmpty.map(Number).filter(v => !isNaN(v))
      return nums.reduce((a, b) => a + b, 0).toLocaleString()
    }
    case 'average': {
      const nums = nonEmpty.map(Number).filter(v => !isNaN(v))
      return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : ''
    }
    case 'min': {
      const nums = nonEmpty.map(Number).filter(v => !isNaN(v))
      return nums.length ? Math.min(...nums).toLocaleString() : ''
    }
    case 'max': {
      const nums = nonEmpty.map(Number).filter(v => !isNaN(v))
      return nums.length ? Math.max(...nums).toLocaleString() : ''
    }
    default: return ''
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SummaryBarProps {
  rows: Record<string, unknown>[]
  selectedRowIndices: number[] | null
  columns: SummaryColDef[]
  colWidths: number[]
  innerRef: React.RefObject<HTMLDivElement>
}

export default function SummaryBar({
  rows,
  selectedRowIndices,
  columns,
  colWidths,
  innerRef,
}: SummaryBarProps) {
  const [ops, setOps] = useState<Record<number, Op>>({})
  const [dropdown, setDropdown] = useState<{ col: number; top: number; left: number; width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdown) return
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdown(null)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [dropdown])

  const activeRows: Record<string, unknown>[] = selectedRowIndices && selectedRowIndices.length > 1
    ? selectedRowIndices.map(i => rows[i]).filter(Boolean) as Record<string, unknown>[]
    : rows

  return (
    <>
      <div
        className="flex-shrink-0 overflow-hidden border-t border-[#E2E8F0] bg-[#F8FAFC]"
        style={{ height: 32 }}
      >
        <div ref={innerRef} style={{ display: 'flex', height: '100%', willChange: 'transform' }}>
          {columns.map((col, i) => {
            const w = colWidths[i] ?? col.width

            {/* First cell: selection info */}
            if (i === 0) {
              return (
                <div
                  key={i}
                  style={{ width: w, flexShrink: 0, padding: '0 8px', display: 'flex', alignItems: 'center' }}
                >
                  {selectedRowIndices && selectedRowIndices.length > 1 && (
                    <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {selectedRowIndices.length}행 선택
                    </span>
                  )}
                </div>
              )
            }

            const dataKey = typeof col.data === 'string' ? col.data : null
            if (!dataKey || !col.fieldType) {
              return <div key={i} style={{ width: w, flexShrink: 0 }} />
            }

            const op = ops[i] ?? 'none'
            const val = calcSummary(op, activeRows, dataKey)
            const availableOps = NUMERIC_LOOKUP_KEYS.has(dataKey)
              ? OPS_FOR_TYPE['number']
              : (OPS_FOR_TYPE[col.fieldType] ?? OPS_DEFAULT)

            return (
              <div
                key={i}
                style={{
                  width: w, flexShrink: 0, padding: '0 6px',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', alignItems: 'flex-end',
                  cursor: 'pointer',
                }}
                className="hover:bg-[#F1F5F9]"
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setDropdown({ col: i, top: rect.top, left: rect.left, width: Math.max(rect.width, 120) })
                }}
              >
                {op !== 'none' && (
                  <span style={{ fontSize: 11, color: '#9CA3AF', lineHeight: '1' }}>
                    {OP_LABELS[op]}
                  </span>
                )}
                {val && (
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: '1.3' }}>
                    {val}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Operation dropdown — opens upward from summary bar */}
      {dropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdown.top - 4,
            left: dropdown.left,
            transform: 'translateY(-100%)',
            minWidth: dropdown.width,
            zIndex: 9999,
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {(() => {
            const col = columns[dropdown.col]
            const dk = typeof col?.data === 'string' ? col.data : ''
            const dropOps = NUMERIC_LOOKUP_KEYS.has(dk)
              ? OPS_FOR_TYPE['number']
              : (OPS_FOR_TYPE[col?.fieldType ?? ''] ?? OPS_DEFAULT)
            return dropOps
          })().map(op => (
            <div
              key={op}
              style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#374151' }}
              className="hover:bg-[#F8FAFC]"
              onClick={() => {
                setOps(prev => ({ ...prev, [dropdown.col]: op }))
                setDropdown(null)
              }}
            >
              {OP_LABELS[op]}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
