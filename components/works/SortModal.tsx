'use client'

import { useEffect, useRef } from 'react'
import ColPicker from './ColPicker'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SortColDef {
  data: string
  title: string
  // 파생 컬럼 — 정렬 드롭다운에서도 제외. RPC 는 flat 테이블 컬럼만 정렬 가능.
  derived?: boolean
}

// `column` 은 `col.data` (flat 테이블 물리 컬럼명) 를 저장한다.
// FilterModal 과 동일한 규약. 레거시 title 기반 preset 은
// normalizeSortConditionsToData() 로 data 키로 정규화된다.
export interface SortCondition {
  id: string
  column: string
  direction: 'asc' | 'desc'
}

export function normalizeSortConditionsToData(
  conditions: SortCondition[],
  columns: { data: string; title: string }[],
): SortCondition[] {
  const dataSet = new Set<string>()
  const titleToData: Record<string, string> = {}
  for (const c of columns) {
    if (typeof c?.data !== 'string' || !c.data) continue
    dataSet.add(c.data)
    if (typeof c.title === 'string' && c.title) titleToData[c.title] = c.data
  }
  return conditions.map(c => {
    if (dataSet.has(c.column)) return c
    const mapped = titleToData[c.column]
    return mapped ? { ...c, column: mapped } : c
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

interface SortModalProps {
  columns: SortColDef[]
  conditions: SortCondition[]
  onChange: (conditions: SortCondition[]) => void
  onApply: () => void
  onClose: () => void
  // "자동 정렬 유지" — ON 이면 컬럼 정렬이 계속 유지되고 sort_order 는 무시.
  // OFF (기본) 면 컬럼 정렬은 1회성이며 RPC 는 sort_order NULLS LAST,
  // created_at ASC 를 기본으로 사용. 페이지가 이 기능을 노출하지 않는
  // 경우 (order-items 이외) props 자체를 생략하면 토글이 숨겨진다.
  keepCustomSort?: boolean
  onKeepCustomSortChange?: (v: boolean) => void
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
  keepCustomSort,
  onKeepCustomSortChange,
}: SortModalProps) {
  const showKeepToggle = typeof keepCustomSort === 'boolean' && typeof onKeepCustomSortChange === 'function'
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

  const filteredCols = columns.filter(c => typeof c.title === 'string' && c.title !== '' && !c.derived)

  const addCondition = () => {
    const firstCol = filteredCols[0]
    if (!firstCol) return
    onChange([...conditions, { id: uid(), column: firstCol.data, direction: 'desc' }])
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
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
        background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: '18px 20px',
        minWidth: 480, maxWidth: 'calc(100vw - 16px)',
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
              width={200}
              onChange={col => onChange(conditions.map(c => c.id === cond.id ? { ...c, column: col } : c))}
            />

            <div style={{
              display: 'inline-flex', background: '#F3F4F6', borderRadius: 6,
              padding: 2, height: 36, alignItems: 'center', flexShrink: 0,
            }}>
              {(['desc', 'asc'] as const).map(dir => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onChange(conditions.map(c => c.id === cond.id ? { ...c, direction: dir } : c))}
                  style={{
                    height: 30, padding: '0 10px', borderRadius: 4, fontSize: 12,
                    border: cond.direction === dir ? '1px solid #D1D5DB' : '1px solid transparent',
                    background: cond.direction === dir ? '#fff' : 'transparent',
                    boxShadow: cond.direction === dir ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    color: cond.direction === dir ? '#111827' : '#9CA3AF',
                    cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                  }}
                >
                  {dir === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
                </button>
              ))}
            </div>

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

      {showKeepToggle && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0 14px', borderTop: '1px solid #F1F5F9', marginBottom: 2,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>자동 정렬 유지</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              OFF: 기본 순서(sort_order) 기준, 컬럼 정렬은 1회성 · ON: 컬럼 정렬을 계속 유지
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!keepCustomSort}
            onClick={() => onKeepCustomSortChange!(!keepCustomSort)}
            style={{
              position: 'relative',
              width: 36, height: 20, borderRadius: 999,
              background: keepCustomSort ? '#2D7FF9' : '#CBD5E1',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              flexShrink: 0, marginLeft: 12,
            }}
          >
            <span
              style={{
                position: 'absolute', top: 2,
                left: keepCustomSort ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: 'white', transition: 'left 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>
      )}

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
