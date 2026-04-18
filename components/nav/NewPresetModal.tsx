'use client'

// Modal for creating a named view preset. Replaces the browser-native
// prompt() so we can show a preview of what's being saved (filter /
// sort / column width / frozen state summary) and match the rest of
// the Works chrome. Keyboard: Enter submits, Esc cancels, autofocus on
// the name input.

import { useEffect, useMemo, useRef, useState } from 'react'

type Snapshot = {
  filters: unknown
  sort: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any
} | null

type Props = {
  open: boolean
  snapshot: Snapshot
  saving: boolean
  onCancel: () => void
  onSubmit: (name: string) => void
}

// Counts filter conditions in RootFilterState (shape: { logic, conditions[] }
// where each condition is either a leaf {columnKey,...} or a group with nested
// conditions). Kept local here rather than importing from FilterModal to avoid
// pulling grid-only code into the nav bundle.
function countFilterConditions(filters: unknown): number {
  if (!filters || typeof filters !== 'object') return 0
  const f = filters as { conditions?: unknown[] }
  if (!Array.isArray(f.conditions)) return 0
  let n = 0
  for (const c of f.conditions) {
    if (!c || typeof c !== 'object') continue
    if (Array.isArray((c as { conditions?: unknown[] }).conditions)) {
      n += countFilterConditions(c)
    } else {
      n += 1
    }
  }
  return n
}

function summarize(snapshot: Snapshot): Array<{ label: string; value: string }> {
  if (!snapshot) return []
  const rows: Array<{ label: string; value: string }> = []

  const fc = countFilterConditions(snapshot.filters)
  rows.push({ label: '필터', value: fc > 0 ? `${fc}개 조건` : '없음' })

  const sort = Array.isArray(snapshot.sort) ? snapshot.sort : []
  rows.push({ label: '정렬', value: sort.length > 0 ? `${sort.length}개 항목` : '없음' })

  const view = snapshot.view
  if (view) {
    const widthCount = view.columnWidths ? Object.keys(view.columnWidths).length : 0
    const hidden = Array.isArray(view.hiddenColumns) ? view.hiddenColumns.length : 0
    const frozen = typeof view.frozenCount === 'number' ? view.frozenCount : 0
    rows.push({ label: '컬럼 폭', value: `${widthCount}개 저장됨` })
    rows.push({ label: '숨김', value: hidden > 0 ? `${hidden}개` : '없음' })
    rows.push({ label: '고정 컬럼', value: frozen > 0 ? `${frozen}개` : '없음' })
    rows.push({ label: '행 높이', value: String(view.rowHeight ?? 'short') })
  } else {
    rows.push({ label: '뷰', value: '기본값' })
  }
  return rows
}

export default function NewPresetModal({ open, snapshot, saving, onCancel, onSubmit }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const summary = useMemo(() => summarize(snapshot), [snapshot])

  useEffect(() => {
    if (!open) return
    setName('')
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 80 && !saving

  const submit = () => {
    if (!canSave) return
    onSubmit(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-start justify-center pt-[18vh] bg-black/30"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        role="dialog"
        aria-label="새 뷰 저장"
        className="w-[420px] max-w-[90vw] rounded-[10px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] border border-[#E2E8F0] flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-4 pt-3 pb-2 border-b border-[#E2E8F0]">
          <div className="text-[13px] font-semibold text-[#0F172A]">새 뷰 저장</div>
          <div className="mt-0.5 text-[11px] text-[#94A3B8]">
            현재 필터 · 정렬 · 컬럼 상태가 이 뷰에 저장됩니다
          </div>
        </div>

        <div className="px-4 pt-3">
          <label className="block text-[11px] font-medium text-[#64748B] mb-1">뷰 이름</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              else if (e.key === 'Escape') { e.preventDefault(); onCancel() }
            }}
            maxLength={80}
            placeholder="예: A급 주문만"
            className="w-full h-[32px] rounded-[6px] border border-[#E2E8F0] bg-white px-2 text-[13px] text-[#111827] placeholder-[#94A3B8] outline-none focus:border-[#2D7FF9]"
          />
          <div className="mt-1 text-[10px] text-[#94A3B8] text-right">{trimmed.length}/80</div>
        </div>

        <div className="px-4 pb-3">
          <div className="rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
              미리보기
            </div>
            {summary.length === 0 && (
              <div className="text-[11px] text-[#94A3B8]">현재 그리드가 로드되지 않았습니다</div>
            )}
            {summary.map(row => (
              <div key={row.label} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-[#64748B]">{row.label}</span>
                <span className="text-[#334155]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-[30px] px-3 rounded-[6px] border border-[#E2E8F0] bg-white text-[12px] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="h-[30px] px-3 rounded-[6px] bg-[#2D7FF9] text-[12px] font-medium text-white hover:bg-[#2570E0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
