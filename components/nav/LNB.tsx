'use client'

// Left Nav Bar — per-workspace navigation. 220px column on the left
// edge of every /works route, collapsible to a 36px rail.
//
// The LNB is now view-only chrome: it surfaces the current page name,
// the star/share/private view sections for the active page, and a
// trash shortcut. Cross-page navigation lives in the Cmd+K palette.
//
// Per-page reuse: the page header and section-bound preset lists are
// derived from `resolveActivePage(pathname)` + the pages.ts registry.
// To hook a new page into the LNB (products, bundles, ...): add a
// PageDef entry to WORKS_PAGES in lib/nav/pages.ts with its `presetKey`.
// The LNB reads `activePage.presetKey` directly — no code change here.
//
// ── Ordering model ─────────────────────────────────────────────────
// Flat list per section (scope × page_key). sort_order is a simple
// integer; rows render sorted ASC. Drag reorder computes a midpoint
// between neighbors. Cross-section moves happen via the right-click
// menu (scope toggle), never drag.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TRASH_PAGE,
  resolveActivePage,
  resolvePageHrefForKey,
} from '@/lib/nav/pages'
import { usePresets } from './PresetsContext'
import {
  applyPreset,
  createPreset,
  deletePreset,
  loadEffectiveSettings,
  snapshotLiveView,
  updatePreset,
  type PresetScope,
  type ViewPreset,
} from '@/lib/works/viewPresets'
import NewPresetModal from './NewPresetModal'

// ── Section collapse persistence ────────────────────────────────────
// Keys: 'favorites' | 'collaborative' | 'private'. Stored as an array
// of collapsed section keys in localStorage.
type SectionKey = 'favorites' | 'collaborative' | 'private'
const SECTION_COLLAPSE_LS = 'works:section-collapsed'
function readSectionCollapseSet(): Set<SectionKey> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SECTION_COLLAPSE_LS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    const valid: SectionKey[] = ['favorites', 'collaborative', 'private']
    return new Set(
      Array.isArray(arr)
        ? arr.filter((x: unknown): x is SectionKey => typeof x === 'string' && (valid as string[]).includes(x))
        : [],
    )
  } catch {
    return new Set()
  }
}
function writeSectionCollapseSet(s: Set<SectionKey>) {
  try {
    window.localStorage.setItem(SECTION_COLLAPSE_LS, JSON.stringify(Array.from(s)))
  } catch {
    /* ignore */
  }
}

// ── Atoms ───────────────────────────────────────────────────────────
// The page name header lives inline in the main render (same row as
// the collapse toggle). Kept here as a comment anchor: the label is
// driven by pages.ts so any new page (products, bundles, ...) gets a
// header with zero LNB changes.

function SectionHeader({
  label,
  open,
  onToggle,
  action,
}: {
  label: string
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? `${label} 접기` : `${label} 펼치기`}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-default)] hover:text-[#0F172A] px-1.5 py-1 rounded-[4px] hover:bg-[#E2E8F0]"
      >
        <ChevronIcon open={open} />
        <span>{label}</span>
      </button>
      {action}
    </div>
  )
}

function Divider() {
  return <div className="mx-3 my-1.5 h-px bg-[#E2E8F0]" aria-hidden="true" />
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? '#F59E0B' : 'none'} stroke={filled ? '#F59E0B' : '#94A3B8'} strokeWidth="1.2" strokeLinejoin="round">
      <polygon points="6,1.2 7.5,4.3 10.8,4.8 8.4,7.2 9,10.5 6,8.9 3,10.5 3.6,7.2 1.2,4.8 4.5,4.3"/>
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
      <circle cx="2.5" cy="2.5" r="1" />
      <circle cx="2.5" cy="6" r="1" />
      <circle cx="2.5" cy="9.5" r="1" />
      <circle cx="7.5" cy="2.5" r="1" />
      <circle cx="7.5" cy="6" r="1" />
      <circle cx="7.5" cy="9.5" r="1" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 120ms' }}
    >
      <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 3.5h9"/>
      <path d="M5.5 3.5V2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V3.5"/>
      <path d="M3.5 3.5l.6 7.5a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-7.5"/>
    </svg>
  )
}

// ── Context menu ────────────────────────────────────────────────────
type MenuItem =
  | { kind: 'action'; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }
  | { kind: 'separator' }

function ContextMenu({
  x, y, items, onClose,
}: {
  x: number; y: number; items: MenuItem[]; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Funnel `onClose` through a ref so the effect below can run with an
  // empty dep array. Callers typically pass an inline `() => setMenu(null)`
  // which is re-created on every LNB render — without the ref indirection
  // that would detach and re-attach the window listeners on each parent
  // render while the menu was open.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onCloseRef.current()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    const t = setTimeout(() => {
      window.addEventListener('mousedown', handler)
      window.addEventListener('keydown', esc)
    }, 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="fixed z-[10002] min-w-[160px] rounded-[6px] border border-[#E2E8F0] bg-white py-1 shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((it, i) => {
        if (it.kind === 'separator') {
          return <div key={`sep-${i}`} className="my-1 h-px bg-[#E2E8F0]" aria-hidden="true" />
        }
        return (
          <button
            key={it.label}
            type="button"
            disabled={it.disabled}
            onClick={() => { if (!it.disabled) { it.onClick(); onClose() } }}
            className={`block w-full text-left px-3 py-1.5 text-[12px] ${
              it.disabled
                ? 'text-[#CBD5E1] cursor-not-allowed'
                : it.danger
                  ? 'text-[#DC2626] hover:bg-[#FEF2F2]'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
            }`}
            role="menuitem"
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Drag-drop types ────────────────────────────────────────────────
type DragData = { id: string; section: PresetScope }
type DropPosition = 'above' | 'below'
type DropTarget = { rowId: string; position: DropPosition }

// ── Preset row ──────────────────────────────────────────────────────
type PresetRowProps = {
  preset: ViewPreset
  active: boolean
  ownedByMe: boolean
  onApply: () => void
  onToggleStar?: () => void
  onRename?: (next: string) => void
  renaming?: boolean
  onRequestRename?: () => void
  onCancelRename?: () => void
  draggable?: boolean
  isDragging?: boolean
  dropLinePosition?: DropPosition | null
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function PresetRow({
  preset, active, ownedByMe,
  onApply, onToggleStar,
  onRename, renaming, onRequestRename, onCancelRename,
  draggable, isDragging, dropLinePosition,
  onDragStart, onDragOver, onDrop, onDragEnd, onContextMenu,
}: PresetRowProps) {
  const [editName, setEditName] = useState(preset.name)
  useEffect(() => { if (renaming) setEditName(preset.name) }, [renaming, preset.name])
  const showStar = ownedByMe && onToggleStar != null
  const showShareTag = preset.scope === 'collaborative'

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onDoubleClick={() => { if (ownedByMe && onRequestRename) onRequestRename() }}
      className={`group relative flex items-center gap-1.5 rounded-[6px] px-1.5 py-2 my-0.5 ${
        active ? 'bg-[#DBEAFE] hover:bg-[#BFDBFE]' : 'hover:bg-[#E2E8F0]'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {dropLinePosition && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 right-0 h-[2px] bg-[#2D7FF9] ${
            dropLinePosition === 'above' ? 'top-0' : 'bottom-0'
          }`}
        />
      )}

      {showStar ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleStar?.() }}
          aria-label={preset.starred ? '즐겨찾기 해제' : '즐겨찾기'}
          className="flex-shrink-0 p-0.5 rounded hover:bg-[#CBD5E1]"
        >
          <StarIcon filled={preset.starred} />
        </button>
      ) : (
        <span className="flex-shrink-0 p-0.5" aria-hidden="true">
          <StarIcon filled={preset.starred} />
        </span>
      )}

      {renaming ? (
        <input
          autoFocus
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={() => {
            const trimmed = editName.trim()
            if (trimmed && trimmed !== preset.name) onRename?.(trimmed)
            else onCancelRename?.()
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const trimmed = editName.trim()
              if (trimmed && trimmed !== preset.name) onRename?.(trimmed)
              else onCancelRename?.()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onCancelRename?.()
            }
          }}
          maxLength={80}
          className="flex-1 min-w-0 h-[22px] rounded-[4px] border border-[#2D7FF9] bg-white px-1 text-[12px] outline-none"
          onClick={e => e.stopPropagation()}
          onDragStart={e => e.preventDefault()}
        />
      ) : (
        <button
          type="button"
          onClick={onApply}
          className={`flex-1 min-w-0 text-left text-[13px] leading-tight truncate ${
            active ? 'text-[#1E3A8A] font-semibold' : 'text-[#334155]'
          }`}
          title={preset.name}
        >
          {preset.name}
        </button>
      )}

      {showShareTag && !renaming && (
        <span
          className={`flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider rounded-[3px] px-1 py-px ${
            ownedByMe ? 'text-[#0EA5E9] bg-[#E0F2FE]' : 'text-[var(--text-default)] bg-[#E2E8F0]'
          }`}
          title={ownedByMe ? '팀 공유 뷰' : '다른 사람의 공유 뷰'}
        >
          공유
        </span>
      )}

      {/* Drag handle — right side, hover-only. */}
      {draggable ? (
        <span
          aria-label="순서 변경"
          title="드래그하여 이동"
          className="flex-shrink-0 flex items-center justify-center w-[14px] h-[16px] text-[#CBD5E1] opacity-0 group-hover:opacity-100 hover:text-[var(--text-default)] cursor-grab active:cursor-grabbing transition-opacity"
        >
          <DragHandleIcon />
        </span>
      ) : (
        <span className="flex-shrink-0 w-[14px] h-[16px]" aria-hidden="true" />
      )}
    </div>
  )
}

// ── Shell ───────────────────────────────────────────────────────────
type Props = {
  collapsed: boolean
  animated: boolean
  onToggle: () => void
}

function ToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {collapsed ? (
        <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 3.5L5.5 7L9 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function ToggleButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
      title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
      className="flex items-center justify-center w-[26px] h-[26px] rounded-[4px] text-[var(--text-default)] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
    >
      <ToggleIcon collapsed={collapsed} />
    </button>
  )
}

// ── Ordering helper ────────────────────────────────────────────────
// Integer midpoint between two sort_order neighbors. Open ends use
// +/- 100 steps; the gap design has plenty of headroom for reorders.
function midpointSort(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return 100
  if (prev == null) return Math.max(1, Math.floor((next as number) / 2))
  if (next == null) return prev + 100
  const mid = Math.round((prev + next) / 2)
  if (mid <= prev) return prev + 1
  if (mid >= next) return next - 1 > prev ? next - 1 : prev + 1
  return mid
}

// ── Main ────────────────────────────────────────────────────────────
export default function LNB({ collapsed, animated, onToggle }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const activePage = resolveActivePage(pathname ?? '')
  const activeKey = activePage?.key ?? null
  const activePresetKey = activePage?.presetKey ?? null

  const { presets, refresh, activeByPage, setActivePreset, currentUserKey } = usePresets()
  const activePresetId = activePresetKey ? (activeByPage[activePresetKey] ?? null) : null

  const isMine = useCallback(
    (ownerKey: string) => ownerKey.toLowerCase() === currentUserKey.toLowerCase(),
    [currentUserKey],
  )

  // ── Optimistic override (sort_order per preset id) ─────────────────
  const [override, setOverride] = useState<Map<string, number> | null>(null)

  const overriddenPresets = useMemo(() => {
    if (!override) return presets
    return presets.map(p => {
      const v = override.get(p.id)
      return v != null ? { ...p, sort_order: v } : p
    })
  }, [presets, override])

  const sortByOrder = useCallback((a: ViewPreset, b: ViewPreset) => {
    const ao = a.sort_order ?? Number.POSITIVE_INFINITY
    const bo = b.sort_order ?? Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return a.created_at.localeCompare(b.created_at)
  }, [])

  // Favorites are scoped to the current page so switching pages does
  // not leak another page's starred views. A page without a presetKey
  // (e.g. coming-soon) shows an empty favorites section.
  const starredPresets = useMemo(
    () => activePresetKey
      ? overriddenPresets.filter(p => p.starred && p.page_key === activePresetKey).slice().sort(sortByOrder)
      : [],
    [overriddenPresets, activePresetKey, sortByOrder],
  )
  const pagePresets = useMemo(
    () => activePresetKey ? overriddenPresets.filter(p => p.page_key === activePresetKey) : [],
    [overriddenPresets, activePresetKey],
  )
  const sharedPresets = useMemo(
    () => pagePresets.filter(p => p.scope === 'collaborative').slice().sort(sortByOrder),
    [pagePresets, sortByOrder],
  )
  const privatePresets = useMemo(
    () => pagePresets.filter(p => p.scope === 'private' && isMine(p.owner_user_key)).slice().sort(sortByOrder),
    [pagePresets, isMine, sortByOrder],
  )

  // ── Modal / rename / menu / section collapse state ────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [snapshot, setSnapshot] = useState<{
    filters: unknown
    sort: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any
  } | null>(null)

  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null)

  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(() => new Set())
  useEffect(() => { setCollapsedSections(readSectionCollapseSet()) }, [])
  const toggleSection = useCallback((key: SectionKey) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeSectionCollapseSet(next)
      return next
    })
  }, [])

  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  // ── Drag state (state for indicators, refs for authoritative reads) ─
  const [drag, setDrag] = useState<DragData | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const dragRef = useRef<DragData | null>(null)
  const dropTargetRef = useRef<DropTarget | null>(null)
  const droppedRef = useRef(false)

  const setDragBoth = useCallback((d: DragData | null) => {
    dragRef.current = d
    setDrag(d)
  }, [])
  const setDropTargetBoth = useCallback((t: DropTarget | null) => {
    const prev = dropTargetRef.current
    if (
      prev === t ||
      (!!prev && !!t && prev.rowId === t.rowId && prev.position === t.position)
    ) return
    dropTargetRef.current = t
    setDropTarget(t)
  }, [])

  // ── Modal ─────────────────────────────────────────────────────────
  const openNewPresetModal = async () => {
    if (!activePresetKey || saving) return
    let snap = snapshotLiveView(activePresetKey)
    if (!snap) {
      const { settings: saved } = await loadEffectiveSettings(activePresetKey)
      snap = saved
        ? { filters: saved.filters, sort: saved.sort, view: saved.view }
        : { filters: null, sort: null, view: null }
    }
    setSnapshot(snap)
    setModalOpen(true)
  }

  const handleSubmitPreset = async (name: string, scope: PresetScope) => {
    if (!activePresetKey || !snapshot) return
    setSaving(true)
    try {
      const created = await createPreset({
        page_key: activePresetKey,
        name,
        scope,
        filters: snapshot.filters ?? null,
        sort: snapshot.sort ?? null,
        view: snapshot.view ?? null,
      })
      if (!created) {
        window.alert('뷰 저장에 실패했습니다')
        return
      }
      setActivePreset(activePresetKey, created.id)
      await refresh()
      setModalOpen(false)
      setSnapshot(null)
    } finally {
      setSaving(false)
    }
  }

  // ── Preset actions ────────────────────────────────────────────────
  const handleApplyPreset = (preset: ViewPreset) => {
    setActivePreset(preset.page_key, preset.id)
    void applyPreset(preset)
    const href = resolvePageHrefForKey(preset.page_key)
    if (href && href !== pathname) router.push(href)
  }

  const handleToggleStar = async (preset: ViewPreset) => {
    const next = await updatePreset(preset.id, { starred: !preset.starred })
    if (next) await refresh()
  }

  const handleDeletePreset = async (preset: ViewPreset) => {
    if (!window.confirm(`'${preset.name}' 뷰를 삭제할까요?`)) return
    const ok = await deletePreset(preset.id)
    if (!ok) return
    if (activePresetKey && activePresetId === preset.id) setActivePreset(activePresetKey, null)
    await refresh()
  }

  const handleRenamePreset = async (preset: ViewPreset, next: string) => {
    const res = await updatePreset(preset.id, { name: next })
    setRenamingPresetId(null)
    if (res) await refresh()
  }

  const handleToggleScope = async (preset: ViewPreset) => {
    const next: PresetScope = preset.scope === 'collaborative' ? 'private' : 'collaborative'
    if (next === 'collaborative') {
      if (!window.confirm(`'${preset.name}' 뷰를 팀에 공유할까요? 팀원 모두가 볼 수 있습니다.`)) return
    } else {
      if (!window.confirm(`'${preset.name}' 뷰를 개인 뷰로 전환할까요? 팀원에게 더 이상 보이지 않습니다.`)) return
    }
    const res = await updatePreset(preset.id, { scope: next })
    if (!res) {
      window.alert('공개 범위 변경에 실패했습니다')
      return
    }
    await refresh()
  }

  const handleCopyToMine = async (preset: ViewPreset) => {
    const created = await createPreset({
      page_key: preset.page_key,
      name: `${preset.name} (복사본)`,
      scope: 'private',
      filters: preset.filters ?? null,
      sort: preset.sort ?? null,
      view: preset.view ?? null,
    })
    if (!created) {
      window.alert('복사에 실패했습니다')
      return
    }
    setActivePreset(preset.page_key, created.id)
    await refresh()
  }

  // ── Commit drop ────────────────────────────────────────────────────
  const commitOverride = useCallback((patch: Map<string, number>, call: Promise<unknown> | null) => {
    setOverride(patch)
    if (!call) {
      setOverride(null)
      return
    }
    void (async () => {
      try {
        const result = await call
        if (result == null) window.alert('저장에 실패했습니다. 원래 상태로 되돌립니다.')
      } catch {
        window.alert('저장 중 오류가 발생했습니다. 원래 상태로 되돌립니다.')
      } finally {
        await refresh()
        setOverride(null)
      }
    })()
  }, [refresh])

  // Drop a preset at target within its own section. Midpoint between
  // new neighbors after removing the dragged preset from its current slot.
  const dropPresetAt = useCallback((section: PresetScope, presetId: string, target: DropTarget) => {
    const list = section === 'collaborative' ? sharedPresets : privatePresets
    const filtered = list.filter(p => p.id !== presetId)
    const targetIdx = filtered.findIndex(p => p.id === target.rowId)
    if (targetIdx < 0) return
    const insertAt = target.position === 'above' ? targetIdx : targetIdx + 1
    const prev = insertAt > 0 ? (filtered[insertAt - 1].sort_order ?? null) : null
    const next = insertAt < filtered.length ? (filtered[insertAt].sort_order ?? null) : null
    const newSort = midpointSort(prev, next)
    const orig = presets.find(p => p.id === presetId)
    if (!orig) return
    const patch = new Map<string, number>()
    patch.set(presetId, newSort)
    const call = orig.sort_order === newSort
      ? null
      : updatePreset(presetId, { sort_order: newSort })
    commitOverride(patch, call)
  }, [sharedPresets, privatePresets, presets, commitOverride])

  // ── Drag event handlers ───────────────────────────────────────────
  const startPresetDrag = (preset: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    droppedRef.current = false
    setDragBoth({ id: preset.id, section: preset.scope })
    try { e.dataTransfer.setData('text/plain', preset.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  const overPresetRow = (target: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.section !== target.scope) return
    if (d.id === target.id) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    const position: DropPosition = y < h / 2 ? 'above' : 'below'
    setDropTargetBoth({ rowId: target.id, position })
  }

  const leaveSectionBg = (e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setDropTargetBoth(null)
  }

  const executeDrop = useCallback((section: PresetScope) => {
    if (droppedRef.current) return
    const d = dragRef.current
    const t = dropTargetRef.current
    if (!d || d.section !== section || !t) {
      setDragBoth(null); setDropTargetBoth(null); return
    }
    droppedRef.current = true
    setDragBoth(null); setDropTargetBoth(null)
    dropPresetAt(section, d.id, t)
  }, [dropPresetAt, setDragBoth, setDropTargetBoth])

  const endDrag = () => {
    setDragBoth(null)
    setDropTargetBoth(null)
    droppedRef.current = false
  }

  // ── Context menus ─────────────────────────────────────────────────
  const openPresetMenu = (preset: ViewPreset, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const mine = isMine(preset.owner_user_key)
    const items: MenuItem[] = []
    if (mine) {
      items.push({ kind: 'action', label: '이름 바꾸기', onClick: () => setRenamingPresetId(preset.id) })
      items.push({ kind: 'action', label: preset.starred ? '즐겨찾기 해제' : '즐겨찾기', onClick: () => void handleToggleStar(preset) })
      items.push({ kind: 'separator' })
      items.push({
        kind: 'action',
        label: preset.scope === 'collaborative' ? '개인 뷰로 전환' : '팀에 공유하기',
        onClick: () => void handleToggleScope(preset),
      })
      items.push({ kind: 'separator' })
      items.push({ kind: 'action', label: '삭제', danger: true, onClick: () => void handleDeletePreset(preset) })
    } else {
      items.push({ kind: 'action', label: '내 뷰로 복사', onClick: () => void handleCopyToMine(preset) })
    }
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  // ── Section renderer ──────────────────────────────────────────────
  const renderPresetSection = (
    section: PresetScope,
    sectionKey: SectionKey,
    label: string,
    rows: ViewPreset[],
  ) => {
    const canCreate = !!activePresetKey
    const open = !collapsedSections.has(sectionKey)

    return (
      <>
        <SectionHeader
          label={label}
          open={open}
          onToggle={() => toggleSection(sectionKey)}
          action={
            canCreate ? (
              <button
                type="button"
                onClick={() => void openNewPresetModal()}
                title={section === 'collaborative' ? '새 공유 뷰' : '새 뷰'}
                className="text-[12px] text-[var(--text-default)] hover:text-[#0F172A] px-1.5 py-0.5 rounded-[4px] hover:bg-[#E2E8F0]"
              >
                + 뷰
              </button>
            ) : null
          }
        />
        {open && (
          <div
            className="relative px-2 pb-1"
            onDragLeave={leaveSectionBg}
            onDrop={e => { e.preventDefault(); executeDrop(section) }}
          >
            {!activePresetKey && (
              <div className="px-2 py-1.5 text-[12px] text-[#94A3B8]">
                뷰를 지원하지 않는 페이지입니다
              </div>
            )}
            {activePresetKey && rows.length === 0 && (
              <div className="px-2 py-1.5 text-[12px] text-[#94A3B8]">
                {section === 'collaborative' ? '공유된 뷰가 없습니다' : '저장된 뷰가 없습니다'}
              </div>
            )}

            {rows.map(preset => {
              const pMine = isMine(preset.owner_user_key)
              const dropLine =
                dropTarget && dropTarget.rowId === preset.id ? dropTarget.position : null
              return (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  active={activePresetId === preset.id}
                  ownedByMe={pMine}
                  onApply={() => handleApplyPreset(preset)}
                  onToggleStar={pMine ? () => void handleToggleStar(preset) : undefined}
                  onRename={next => void handleRenamePreset(preset, next)}
                  renaming={renamingPresetId === preset.id}
                  onRequestRename={() => setRenamingPresetId(preset.id)}
                  onCancelRename={() => setRenamingPresetId(null)}
                  draggable={pMine}
                  isDragging={drag?.id === preset.id}
                  dropLinePosition={dropLine}
                  onDragStart={pMine ? startPresetDrag(preset) : undefined}
                  onDragOver={overPresetRow(preset)}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); executeDrop(section) }}
                  onDragEnd={endDrag}
                  onContextMenu={e => openPresetMenu(preset, e)}
                />
              )
            })}
          </div>
        )}
      </>
    )
  }

  // ── Layout ────────────────────────────────────────────────────────
  const widthClass = collapsed ? 'w-[36px]' : 'w-[220px]'
  const transitionClass = animated ? 'transition-[width] duration-200 ease-out' : ''

  if (collapsed) {
    return (
      <aside
        data-worksy-lnb
        aria-label="사이드바 (접힘)"
        className={`flex-shrink-0 ${widthClass} ${transitionClass} h-full border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col items-center pt-2 overflow-hidden`}
      >
        <div data-worksy-lnb-toggle>
          <ToggleButton collapsed={collapsed} onToggle={onToggle} />
        </div>
      </aside>
    )
  }

  const favoritesOpen = !collapsedSections.has('favorites')

  return (
    <aside
      data-worksy-lnb
      className={`flex-shrink-0 ${widthClass} ${transitionClass} h-full border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-hidden`}
    >
      <div
        data-worksy-lnb-toggle
        className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0"
      >
        <div
          className="flex-1 min-w-0 pl-3 text-[14px] font-semibold leading-[26px] text-[#0F172A] truncate"
          title={activePage?.label ?? undefined}
        >
          {activePage?.label ?? '\u00A0'}
        </div>
        <ToggleButton collapsed={collapsed} onToggle={onToggle} />
      </div>
      <div className="mx-3 h-px bg-[#E2E8F0]" aria-hidden="true" />

      <div className="flex-1 min-h-0 overflow-y-auto pt-1">
        {/* 즐겨찾기 */}
        <SectionHeader
          label="즐겨찾기"
          open={favoritesOpen}
          onToggle={() => toggleSection('favorites')}
        />
        {favoritesOpen && (
          <div className="px-2 pb-1">
            {starredPresets.length === 0 && (
              <div className="px-2 py-1.5 text-[12px] text-[#94A3B8]">
                별표를 눌러 뷰를 고정하세요
              </div>
            )}
            {starredPresets.map(p => {
              const mine = isMine(p.owner_user_key)
              return (
                <PresetRow
                  key={`fav-${p.id}`}
                  preset={p}
                  active={p.page_key === activePresetKey && activePresetId === p.id}
                  ownedByMe={mine}
                  onApply={() => handleApplyPreset(p)}
                  onToggleStar={mine ? () => void handleToggleStar(p) : undefined}
                  onContextMenu={e => openPresetMenu(p, e)}
                />
              )
            })}
          </div>
        )}

        <Divider />

        {renderPresetSection('collaborative', 'collaborative', '공유 뷰', sharedPresets)}

        <Divider />

        {renderPresetSection('private', 'private', '내 뷰', privatePresets)}
      </div>

      {/* 휴지통 — pinned bottom */}
      <div className="flex-shrink-0">
        <Divider />
        <nav className="flex flex-col px-2 pb-3">
          <Link
            href={TRASH_PAGE.href ?? '#'}
            className={`flex items-center gap-2 rounded-[6px] px-2 py-2 text-[13px] transition-colors ${
              activeKey === TRASH_PAGE.key
                ? 'bg-[#2D7FF9] text-white font-medium'
                : 'text-[#334155] hover:bg-[#E2E8F0]'
            }`}
          >
            <TrashIcon />
            <span>{TRASH_PAGE.label}</span>
          </Link>
        </nav>
      </div>

      <NewPresetModal
        open={modalOpen}
        snapshot={snapshot}
        saving={saving}
        onCancel={() => { if (!saving) { setModalOpen(false); setSnapshot(null) } }}
        onSubmit={handleSubmitPreset}
      />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  )
}
