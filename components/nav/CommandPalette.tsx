'use client'

// Cmd+K "빠른 이동" palette. Modal overlay with a search input and a
// keyboard-navigable list of all destinations (pages today; pages × views
// once commit 7 lands views, which will prepend a 즐겨찾기 section).
//
// - Filtering: case-insensitive substring match on label.
// - Active-row tracking: ↑/↓ moves the highlight, Enter navigates, Esc
//   closes. Mouse hover also syncs the highlight so keyboard + mouse
//   don't fight.
// - Highlighting: the matched substring is wrapped in <mark> so the
//   reason a row shows up is obvious at a glance.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WORKS_PAGES, TRASH_PAGE, type PageDef } from '@/lib/nav/pages'

type Entry = {
  id: string
  label: string
  section: string
  href: string | null
  disabled: boolean
  page: PageDef
}

function buildEntries(): Entry[] {
  const items: Entry[] = []
  for (const p of [...WORKS_PAGES, TRASH_PAGE]) {
    items.push({
      id: `page:${p.key}`,
      label: p.label,
      section: p.key === TRASH_PAGE.key ? '휴지통' : '페이지',
      href: p.href,
      disabled: p.status !== 'active',
      page: p,
    })
  }
  return items
}

function matchEntries(entries: Entry[], q: string): Entry[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return entries
  return entries.filter(e => e.label.toLowerCase().includes(needle))
}

function renderHighlighted(label: string, q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return label
  const idx = label.toLowerCase().indexOf(needle)
  if (idx < 0) return label
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-[#FEF3C7] text-[#111827] rounded-[2px] px-0.5">{label.slice(idx, idx + needle.length)}</mark>
      {label.slice(idx + needle.length)}
    </>
  )
}

type Props = {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  const allEntries = useMemo(() => buildEntries(), [])
  const visible = useMemo(() => matchEntries(allEntries, query), [allEntries, query])

  // Reset query/selection when the palette opens, and focus the input.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIdx(0)
    // Next tick so the <input> is in the DOM.
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  // Clamp activeIdx whenever the filtered list shrinks.
  useEffect(() => {
    if (activeIdx >= visible.length) setActiveIdx(Math.max(0, visible.length - 1))
  }, [visible.length, activeIdx])

  // Keep the active row scrolled into view as the user arrows through.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open])

  if (!open) return null

  const handleSelect = (entry: Entry) => {
    if (entry.disabled || !entry.href) return
    onClose()
    router.push(entry.href)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] bg-black/30"
      onMouseDown={e => {
        // Click on backdrop closes; clicks on the dialog bubble up after
        // stopPropagation inside the dialog itself.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-label="빠른 이동"
        className="w-[520px] max-w-[90vw] max-h-[60vh] rounded-[10px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] border border-[#E2E8F0] flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E2E8F0]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="#94A3B8" strokeWidth="1.2"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIdx(i => Math.min(i + 1, Math.max(0, visible.length - 1)))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIdx(i => Math.max(0, i - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const entry = visible[activeIdx]
                if (entry) handleSelect(entry)
              }
            }}
            placeholder="페이지, 뷰 검색…"
            className="flex-1 h-[28px] text-[14px] text-[#111827] placeholder-[#94A3B8] bg-transparent outline-none"
          />
          <kbd className="inline-flex items-center rounded-[3px] border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0 h-[16px] text-[10px] font-medium text-[#94A3B8]">Esc</kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {visible.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[#94A3B8]">
              일치하는 항목이 없습니다
            </div>
          )}
          {visible.map((entry, i) => {
            const isActive = i === activeIdx
            return (
              <div
                key={entry.id}
                data-idx={i}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={e => { e.preventDefault(); handleSelect(entry) }}
                className={`flex items-center justify-between px-3 py-2 mx-1 rounded-[6px] cursor-pointer ${
                  isActive ? 'bg-[#F1F5F9]' : ''
                } ${entry.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 text-[13px] text-[#111827]">
                  <span>{renderHighlighted(entry.label, query)}</span>
                  {entry.disabled && (
                    <span className="text-[10px] rounded-[3px] bg-[#E2E8F0] px-1.5 py-0.5 text-[#64748B]">준비중</span>
                  )}
                </div>
                <span className="text-[11px] text-[#94A3B8]">{entry.section}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
