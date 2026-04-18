'use client'

// Left Nav Bar — per-workspace navigation. 220px column on the left
// edge of every /works route, collapsible to a 36px rail.
//
// ── Ordering model ─────────────────────────────────────────────────
// sort_order is a SINGLE global number space shared by folders and
// presets within a section (scope × page_key). Conventionally:
//   - folders sit at coarse positions (100, 200, 300, ...)
//   - a folder's members sit immediately after it (+10, +20, ...)
//   - top-level presets (folder_id = null) occupy gaps between folders
//
// Rendering: sort all folders+presets together by sort_order, then
// walk in order. A preset's indent is driven by folder_id. Folder
// members naturally follow their folder because the DB invariant
// keeps member.sort_order in the range (folder.sort_order, next_folder).
//
// Drop: we compute a NEW sort_order for the dragged row as the
// integer midpoint between its new neighbors. folder_id is derived
// from the drop context. Optimistic override applies the new values
// immediately; API calls run in the background.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  WORKS_PAGES,
  TRASH_PAGE,
  resolveActivePage,
  resolvePageHrefForKey,
} from '@/lib/nav/pages'
import { usePresets } from './PresetsContext'
import {
  applyPreset,
  createFolder,
  createPreset,
  deleteFolder,
  deletePreset,
  loadEffectiveSettings,
  snapshotLiveView,
  updateFolder,
  updatePreset,
  type PresetScope,
  type ViewFolder,
  type ViewPreset,
} from '@/lib/works/viewPresets'
import NewPresetModal from './NewPresetModal'

// ── Page key mapping ────────────────────────────────────────────────
function presetKeyForActivePage(activeKey: string | null): string | null {
  if (activeKey === 'production') return 'works'
  if (activeKey === 'trash') return 'works-trash'
  return null
}

// ── Folder collapse persistence ─────────────────────────────────────
const FOLDER_COLLAPSE_LS = 'works:folder-collapsed'
function readFolderCollapseSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(FOLDER_COLLAPSE_LS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}
function writeFolderCollapseSet(s: Set<string>) {
  try {
    window.localStorage.setItem(FOLDER_COLLAPSE_LS, JSON.stringify(Array.from(s)))
  } catch {
    /* ignore */
  }
}

// ── Atoms ───────────────────────────────────────────────────────────
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {children}
      </span>
      {action}
    </div>
  )
}

function Divider() {
  return <div className="mx-3 my-2 h-px bg-[#E2E8F0]" aria-hidden="true" />
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

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="#CBD5E1" aria-hidden="true">
      <path d="M1 3.25A1.25 1.25 0 0 1 2.25 2h2.1c.28 0 .54.1.75.27l.7.58c.21.17.47.27.75.27H9.75A1.25 1.25 0 0 1 11 4.37v4.38A1.25 1.25 0 0 1 9.75 10H2.25A1.25 1.25 0 0 1 1 8.75v-5.5z"/>
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
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const t = setTimeout(() => {
      window.addEventListener('mousedown', handler)
      window.addEventListener('keydown', esc)
    }, 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

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
type DragData =
  | { kind: 'preset'; id: string; section: PresetScope }
  | { kind: 'folder'; id: string; section: PresetScope }

// Drop indicator target (what the UI shows). Converted at drop-time
// into a concrete {sort_order, folder_id} via resolveInsertContext.
type DropTarget =
  | { kind: 'above-row'; rowId: string }
  | { kind: 'below-row'; rowId: string }
  | { kind: 'into-folder'; folderId: string }
  | { kind: 'section-bottom'; section: PresetScope }

type UnifiedRow =
  | { kind: 'folder'; id: string; folder: ViewFolder; sortOrder: number }
  | { kind: 'preset'; id: string; preset: ViewPreset; folderId: string | null; sortOrder: number }

// ── Preset / folder rows ────────────────────────────────────────────
type PresetRowProps = {
  preset: ViewPreset
  active: boolean
  ownedByMe: boolean
  indented?: boolean
  onApply: () => void
  onToggleStar?: () => void
  onCopyToMine?: () => void
  onRename?: (next: string) => void
  renaming?: boolean
  onRequestRename?: () => void
  onCancelRename?: () => void
  draggable?: boolean
  isDragging?: boolean
  dropLinePosition?: 'above' | 'below' | null
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function PresetRow({
  preset, active, ownedByMe, indented,
  onApply, onToggleStar, onCopyToMine,
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
      className={`group relative flex items-center gap-1 rounded-[6px] px-1 py-1 ${
        indented ? 'ml-4' : ''
      } ${active ? 'bg-[#DBEAFE] hover:bg-[#BFDBFE]' : 'hover:bg-[#E2E8F0]'} ${
        isDragging ? 'opacity-40' : ''
      }`}
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
          className={`flex-1 min-w-0 text-left text-[12px] truncate ${
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
            ownedByMe ? 'text-[#0EA5E9] bg-[#E0F2FE]' : 'text-[#64748B] bg-[#E2E8F0]'
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
          className="flex-shrink-0 flex items-center justify-center w-[14px] h-[16px] text-[#CBD5E1] opacity-0 group-hover:opacity-100 hover:text-[#64748B] cursor-grab active:cursor-grabbing transition-opacity"
        >
          <DragHandleIcon />
        </span>
      ) : (
        <span className="flex-shrink-0 w-[14px] h-[16px]" aria-hidden="true" />
      )}
      {/* onCopyToMine exposed via right-click menu; keep prop for typing */}
      {onCopyToMine ? null : null}
    </div>
  )
}

type FolderRowProps = {
  folder: ViewFolder
  ownedByMe: boolean
  open: boolean
  onToggle: () => void
  onRename?: (next: string) => void
  renaming?: boolean
  onRequestRename?: () => void
  onCancelRename?: () => void
  draggable?: boolean
  isDragging?: boolean
  dropLinePosition?: 'above' | 'below' | null
  dropInto?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function FolderRow({
  folder, ownedByMe, open, onToggle,
  onRename, renaming, onRequestRename, onCancelRename,
  draggable, isDragging, dropLinePosition, dropInto,
  onDragStart, onDragOver, onDrop, onDragEnd, onContextMenu,
}: FolderRowProps) {
  const [editName, setEditName] = useState(folder.name)
  useEffect(() => { if (renaming) setEditName(folder.name) }, [renaming, folder.name])

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onDoubleClick={() => { if (ownedByMe && onRequestRename) onRequestRename() }}
      className={`group relative flex items-center gap-1 rounded-[6px] px-1 py-1 hover:bg-[#E2E8F0] ${
        isDragging ? 'opacity-40' : ''
      } ${dropInto ? 'ring-2 ring-[#2D7FF9] ring-offset-0' : ''}`}
    >
      {dropLinePosition && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 right-0 h-[2px] bg-[#2D7FF9] ${
            dropLinePosition === 'above' ? 'top-0' : 'bottom-0'
          }`}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? '폴더 접기' : '폴더 펼치기'}
        className="flex-shrink-0 p-0.5 rounded text-[#64748B] hover:bg-[#CBD5E1]"
      >
        <ChevronIcon open={open} />
      </button>

      <span className="flex-shrink-0" aria-hidden="true">
        <FolderIcon />
      </span>

      {renaming ? (
        <input
          autoFocus
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={() => {
            const trimmed = editName.trim()
            if (trimmed && trimmed !== folder.name) onRename?.(trimmed)
            else onCancelRename?.()
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const trimmed = editName.trim()
              if (trimmed && trimmed !== folder.name) onRename?.(trimmed)
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
          onClick={onToggle}
          className="flex-1 min-w-0 text-left text-[12px] truncate font-medium text-[#475569]"
          title={folder.name}
        >
          {folder.name}
        </button>
      )}

      {/* Drag handle — right side, hover-only. */}
      {draggable ? (
        <span
          aria-label="폴더 순서 변경"
          title="드래그하여 폴더 순서 변경"
          className="flex-shrink-0 flex items-center justify-center w-[14px] h-[16px] text-[#CBD5E1] opacity-0 group-hover:opacity-100 hover:text-[#64748B] cursor-grab active:cursor-grabbing transition-opacity"
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
      className="flex items-center justify-center w-[26px] h-[26px] rounded-[4px] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] transition-colors"
    >
      <ToggleIcon collapsed={collapsed} />
    </button>
  )
}

// ── Ordering helpers ───────────────────────────────────────────────
// Build a unified visual list (folders + presets) sorted by global
// sort_order. Members follow their folder because the DB invariant
// places member.sort_order immediately after folder.sort_order.
function buildVisualRows(presets: ViewPreset[], folders: ViewFolder[]): UnifiedRow[] {
  const rows: UnifiedRow[] = []
  for (const f of folders) {
    rows.push({
      kind: 'folder',
      id: f.id,
      folder: f,
      sortOrder: f.sort_order ?? Number.POSITIVE_INFINITY,
    })
  }
  for (const p of presets) {
    rows.push({
      kind: 'preset',
      id: p.id,
      preset: p,
      folderId: p.folder_id ?? null,
      sortOrder: p.sort_order ?? Number.POSITIVE_INFINITY,
    })
  }
  rows.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    // Tiebreak: folders before presets (so folder row opens the group),
    // then by created_at for determinism.
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    const aCreated = a.kind === 'folder' ? a.folder.created_at : a.preset.created_at
    const bCreated = b.kind === 'folder' ? b.folder.created_at : b.preset.created_at
    return aCreated.localeCompare(bCreated)
  })
  return rows
}

// Given visual rows with a row REMOVED (the dragged one), plus a drop
// target indicator, return where to insert (as index in the filtered
// list) along with the folder_id context for that slot.
function resolveInsertContext(
  filtered: UnifiedRow[],
  target: DropTarget,
): { insertAt: number; folderId: string | null } | null {
  if (target.kind === 'section-bottom') {
    return { insertAt: filtered.length, folderId: null }
  }
  if (target.kind === 'into-folder') {
    const folderIdx = filtered.findIndex(r => r.kind === 'folder' && r.id === target.folderId)
    if (folderIdx < 0) return null
    // End of folder's member block.
    let end = folderIdx + 1
    while (
      end < filtered.length &&
      filtered[end].kind === 'preset' &&
      (filtered[end] as Extract<UnifiedRow, { kind: 'preset' }>).folderId === target.folderId
    ) end++
    return { insertAt: end, folderId: target.folderId }
  }
  const idx = filtered.findIndex(r => r.id === target.rowId)
  if (idx < 0) return null
  const row = filtered[idx]
  if (target.kind === 'above-row') {
    const folderId = row.kind === 'folder' ? null : row.folderId
    return { insertAt: idx, folderId }
  }
  // below-row
  if (row.kind === 'folder') {
    // Past the whole folder block (top-level slot after folder).
    let end = idx + 1
    while (
      end < filtered.length &&
      filtered[end].kind === 'preset' &&
      (filtered[end] as Extract<UnifiedRow, { kind: 'preset' }>).folderId === row.id
    ) end++
    return { insertAt: end, folderId: null }
  }
  return { insertAt: idx + 1, folderId: row.folderId }
}

// Integer midpoint with open ends. prev/next are the sort_orders of
// the rows that will flank the dropped item after the drop commits.
function midpointSort(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return 100
  if (prev == null) return Math.max(1, Math.floor((next as number) / 2))
  if (next == null) return prev + 100
  const mid = Math.round((prev + next) / 2)
  // Collision guard: if mid collides with a neighbor and there's no
  // room, we still return something sensible. True rebalancing is
  // deferred (the 100/10 gap design gives plenty of headroom).
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
  const activePresetKey = presetKeyForActivePage(activeKey)

  const { presets, folders, refresh, activeByPage, setActivePreset, currentUserKey } = usePresets()
  const activePresetId = activePresetKey ? (activeByPage[activePresetKey] ?? null) : null

  const isMine = useCallback(
    (ownerKey: string) => ownerKey.toLowerCase() === currentUserKey.toLowerCase(),
    [currentUserKey],
  )

  // ── Optimistic override ────────────────────────────────────────────
  // Map from id → new sort_order (and folder_id for presets). Applied
  // before render so a drop reflects instantly; cleared after the
  // background PATCHes resolve via refresh().
  type Override = {
    presets: Map<string, { sort_order: number; folder_id: string | null }>
    folders: Map<string, { sort_order: number }>
  }
  const [override, setOverride] = useState<Override | null>(null)

  const overriddenPresets = useMemo(() => {
    if (!override) return presets
    return presets.map(p => {
      const o = override.presets.get(p.id)
      return o ? { ...p, sort_order: o.sort_order, folder_id: o.folder_id } : p
    })
  }, [presets, override])

  const overriddenFolders = useMemo(() => {
    if (!override) return folders
    return folders.map(f => {
      const o = override.folders.get(f.id)
      return o ? { ...f, sort_order: o.sort_order } : f
    })
  }, [folders, override])

  const starredPresets = useMemo(() => overriddenPresets.filter(p => p.starred), [overriddenPresets])
  const pagePresets = useMemo(
    () => activePresetKey ? overriddenPresets.filter(p => p.page_key === activePresetKey) : [],
    [overriddenPresets, activePresetKey],
  )
  const pageFolders = useMemo(
    () => activePresetKey ? overriddenFolders.filter(f => f.page_key === activePresetKey) : [],
    [overriddenFolders, activePresetKey],
  )

  const sharedPresets = useMemo(() => pagePresets.filter(p => p.scope === 'collaborative'), [pagePresets])
  const privatePresets = useMemo(
    () => pagePresets.filter(p => p.scope === 'private' && isMine(p.owner_user_key)),
    [pagePresets, isMine],
  )
  const sharedFolders = useMemo(() => pageFolders.filter(f => f.scope === 'collaborative'), [pageFolders])
  const privateFolders = useMemo(
    () => pageFolders.filter(f => f.scope === 'private' && isMine(f.owner_user_key)),
    [pageFolders, isMine],
  )

  const sharedRows = useMemo(() => buildVisualRows(sharedPresets, sharedFolders), [sharedPresets, sharedFolders])
  const privateRows = useMemo(() => buildVisualRows(privatePresets, privateFolders), [privatePresets, privateFolders])

  // ── Modal / rename / menu / collapse state ────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTargetFolderId, setModalTargetFolderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [snapshot, setSnapshot] = useState<{
    filters: unknown
    sort: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any
  } | null>(null)

  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set())
  useEffect(() => { setCollapsedFolders(readFolderCollapseSet()) }, [])
  const toggleFolder = useCallback((id: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writeFolderCollapseSet(next)
      return next
    })
  }, [])

  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  // ── Drag state (state drives indicators, refs for authoritative reads) ──
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
    const same = !!prev && !!t && JSON.stringify(prev) === JSON.stringify(t)
    if (prev === t || same) return
    dropTargetRef.current = t
    setDropTarget(t)
  }, [])

  // ── Modal ─────────────────────────────────────────────────────────
  const openNewPresetModal = async (folderId: string | null) => {
    if (!activePresetKey || saving) return
    let snap = snapshotLiveView(activePresetKey)
    if (!snap) {
      const { settings: saved } = await loadEffectiveSettings(activePresetKey)
      snap = saved
        ? { filters: saved.filters, sort: saved.sort, view: saved.view }
        : { filters: null, sort: null, view: null }
    }
    setSnapshot(snap)
    setModalTargetFolderId(folderId)
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
        folder_id: modalTargetFolderId,
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
      setModalTargetFolderId(null)
    } finally {
      setSaving(false)
    }
  }

  // ── Preset / folder actions ───────────────────────────────────────
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
    const folder = preset.folder_id ? folders.find(f => f.id === preset.folder_id) : null
    const detachFolder = folder && folder.scope !== next
    const res = await updatePreset(preset.id, {
      scope: next,
      ...(detachFolder ? { folder_id: null } : {}),
    })
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
      folder_id: null,
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

  const handleCreateFolder = async (scope: PresetScope) => {
    if (!activePresetKey) return
    const name = window.prompt('새 폴더 이름', '새 폴더')?.trim()
    if (!name) return
    const created = await createFolder({ page_key: activePresetKey, name, scope })
    if (!created) {
      window.alert('폴더 생성에 실패했습니다')
      return
    }
    await refresh()
  }

  const handleRenameFolder = async (folder: ViewFolder, next: string) => {
    const res = await updateFolder(folder.id, { name: next })
    setRenamingFolderId(null)
    if (res) await refresh()
  }

  const handleDeleteFolder = async (folder: ViewFolder) => {
    if (!window.confirm(`'${folder.name}' 폴더를 삭제할까요? (포함된 뷰는 섹션 최상위로 이동됩니다)`)) return
    const ok = await deleteFolder(folder.id)
    if (!ok) return
    await refresh()
  }

  // ── Commit drop ────────────────────────────────────────────────────
  // Apply an optimistic override then PATCH affected rows in parallel.
  // After all PATCHes resolve we refresh() and clear the override.
  const commitOverride = useCallback((patch: Override, calls: Array<Promise<unknown>>) => {
    setOverride(patch)
    if (calls.length === 0) {
      setOverride(null)
      return
    }
    void (async () => {
      try {
        const results = await Promise.all(calls)
        const anyFailed = results.some(r => r == null)
        if (anyFailed) window.alert('일부 항목 저장에 실패했습니다. 원래 상태로 되돌립니다.')
      } catch {
        window.alert('저장 중 오류가 발생했습니다. 원래 상태로 되돌립니다.')
      } finally {
        await refresh()
        setOverride(null)
      }
    })()
  }, [refresh])

  // Drop a preset at the given target. Computes new (folder_id,
  // sort_order) via midpoint between new neighbors.
  const dropPresetAt = useCallback((section: PresetScope, presetId: string, target: DropTarget) => {
    const rows = section === 'collaborative' ? sharedRows : privateRows
    const filtered = rows.filter(r => r.id !== presetId)
    const ctx = resolveInsertContext(filtered, target)
    if (!ctx) return
    const prev = ctx.insertAt > 0 ? filtered[ctx.insertAt - 1].sortOrder : null
    const next = ctx.insertAt < filtered.length ? filtered[ctx.insertAt].sortOrder : null
    const newSort = midpointSort(prev, next)
    const orig = presets.find(p => p.id === presetId)
    if (!orig) return
    const patch: Override = { presets: new Map(), folders: new Map() }
    patch.presets.set(presetId, { sort_order: newSort, folder_id: ctx.folderId })
    // Skip the API call if nothing actually changed.
    const unchanged =
      orig.sort_order === newSort && (orig.folder_id ?? null) === ctx.folderId
    const calls: Array<Promise<unknown>> = unchanged
      ? []
      : [updatePreset(presetId, { sort_order: newSort, folder_id: ctx.folderId })]
    commitOverride(patch, calls)
  }, [sharedRows, privateRows, presets, commitOverride])

  // Drop a folder at the given target. Folders always land at
  // top-level (folder_id is not applicable). Members are shifted to
  // stay contiguous with the folder's new sort_order.
  const dropFolderAt = useCallback((section: PresetScope, folderId: string, target: DropTarget) => {
    const rows = section === 'collaborative' ? sharedRows : privateRows
    // Exclude the dragged folder AND its members from the filtered
    // list when choosing the insertion point.
    const memberIds = new Set(
      rows
        .filter(r => r.kind === 'preset' && r.folderId === folderId)
        .map(r => r.id),
    )
    const filtered = rows.filter(r => r.id !== folderId && !memberIds.has(r.id))
    const ctx = resolveInsertContext(filtered, target)
    if (!ctx) return
    // Folder cannot land inside another folder — reject into-folder /
    // below-row-of-preset-in-folder.
    if (target.kind === 'into-folder') return
    const prev = ctx.insertAt > 0 ? filtered[ctx.insertAt - 1].sortOrder : null
    const next = ctx.insertAt < filtered.length ? filtered[ctx.insertAt].sortOrder : null
    const newFolderSort = midpointSort(prev, next)
    const origFolder = folders.find(f => f.id === folderId)
    if (!origFolder) return
    // Members: evenly distribute in the available space so they stay
    // within (newFolderSort, nextSort). Preserves their relative order.
    const memberRows = rows
      .filter(r => r.kind === 'preset' && r.folderId === folderId)
      .sort((a, b) => a.sortOrder - b.sortOrder) as Extract<UnifiedRow, { kind: 'preset' }>[]
    const upperBound = next != null ? next : newFolderSort + (memberRows.length + 1) * 100
    const available = Math.max(1, upperBound - newFolderSort)
    const step = Math.max(1, Math.floor(available / (memberRows.length + 1)))
    const patch: Override = { presets: new Map(), folders: new Map() }
    patch.folders.set(folderId, { sort_order: newFolderSort })
    const calls: Array<Promise<unknown>> = []
    if (origFolder.sort_order !== newFolderSort) {
      calls.push(updateFolder(folderId, { sort_order: newFolderSort }))
    }
    memberRows.forEach((m, i) => {
      const newMemberSort = newFolderSort + (i + 1) * step
      patch.presets.set(m.id, { sort_order: newMemberSort, folder_id: folderId })
      if (m.preset.sort_order !== newMemberSort) {
        calls.push(updatePreset(m.id, { sort_order: newMemberSort, folder_id: folderId }))
      }
    })
    commitOverride(patch, calls)
  }, [sharedRows, privateRows, folders, commitOverride])

  // ── Drag event handlers ───────────────────────────────────────────
  const startPresetDrag = (preset: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    droppedRef.current = false
    setDragBoth({ kind: 'preset', id: preset.id, section: preset.scope })
    try { e.dataTransfer.setData('text/plain', preset.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  const startFolderDrag = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    droppedRef.current = false
    setDragBoth({ kind: 'folder', id: folder.id, section: folder.scope })
    try { e.dataTransfer.setData('text/plain', folder.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  // Preset row hover. 50/50 split: top = above, bottom = below.
  // stopPropagation so the section container handler doesn't clobber.
  const overPresetRow = (target: UnifiedRow & { kind: 'preset' }) => (e: React.DragEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.section !== target.preset.scope) return
    if (d.kind === 'preset' && d.id === target.id) return
    // Folder drag into a preset that's inside a folder: not allowed
    // (folder can't be placed inside another folder).
    if (d.kind === 'folder' && target.folderId !== null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    const position: 'above' | 'below' = y < h / 2 ? 'above' : 'below'
    setDropTargetBoth(
      position === 'above'
        ? { kind: 'above-row', rowId: target.id }
        : { kind: 'below-row', rowId: target.id },
    )
  }

  // Folder row hover.
  //   preset drag: 40% above / 60% into
  //   folder drag: 50/50 above/below (top-level reorder)
  const overFolderRow = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.section !== folder.scope) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height

    if (d.kind === 'folder') {
      if (d.id === folder.id) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      const position: 'above' | 'below' = y < h / 2 ? 'above' : 'below'
      setDropTargetBoth(
        position === 'above'
          ? { kind: 'above-row', rowId: folder.id }
          : { kind: 'below-row', rowId: folder.id },
      )
      return
    }

    // Preset drag
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (y < h * 0.4) {
      setDropTargetBoth({ kind: 'above-row', rowId: folder.id })
    } else {
      setDropTargetBoth({ kind: 'into-folder', folderId: folder.id })
    }
  }

  // Section bottom zone — always valid for any drag in the same
  // section (appends at the very end, top-level).
  const overSectionBottom = (section: PresetScope) => (e: React.DragEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.section !== section) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetBoth({ kind: 'section-bottom', section })
  }

  // Section container — fallback when neither a row nor the bottom
  // zone claims the cursor. Preset drag only; falls back to bottom.
  const overSectionBg = (section: PresetScope) => (e: React.DragEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.section !== section) return
    if (d.kind !== 'preset') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Only claim the section-bottom if no row has claimed a target
    // within this event pass (row handlers stopPropagation; but if
    // cursor is between rows, this runs).
    if (!dropTargetRef.current || dropTargetRef.current.kind !== 'section-bottom') {
      setDropTargetBoth({ kind: 'section-bottom', section })
    }
  }

  const leaveSectionBg = (e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setDropTargetBoth(null)
  }

  // ── Drop executor ─────────────────────────────────────────────────
  const executeDrop = useCallback((section: PresetScope) => {
    if (droppedRef.current) return
    const d = dragRef.current
    const t = dropTargetRef.current
    if (!d || d.section !== section || !t) {
      setDragBoth(null); setDropTargetBoth(null); return
    }
    droppedRef.current = true
    setDragBoth(null); setDropTargetBoth(null)
    if (d.kind === 'preset') dropPresetAt(section, d.id, t)
    else dropFolderAt(section, d.id, t)
  }, [dropPresetAt, dropFolderAt, setDragBoth, setDropTargetBoth])

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

  const openFolderMenu = (folder: ViewFolder, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const mine = isMine(folder.owner_user_key)
    const items: MenuItem[] = []
    if (mine) {
      items.push({ kind: 'action', label: '이름 바꾸기', onClick: () => setRenamingFolderId(folder.id) })
      items.push({ kind: 'separator' })
      items.push({ kind: 'action', label: '삭제', danger: true, onClick: () => void handleDeleteFolder(folder) })
    }
    if (items.length === 0) return
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  // ── Section renderer ──────────────────────────────────────────────
  const renderPresetSection = (
    section: PresetScope,
    label: string,
    rows: UnifiedRow[],
  ) => {
    const canCreate = !!activePresetKey
    const dragging = drag?.section === section
    const bottomActive = dropTarget?.kind === 'section-bottom' && dropTarget.section === section
    // When dragging a folder, dim its members too for a visual "block" cue.
    const folderBlockBeingDragged =
      drag?.kind === 'folder' && drag.section === section ? drag.id : null

    return (
      <>
        <SectionLabel
          action={
            canCreate ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCreateFolder(section)}
                  title="새 폴더"
                  className="text-[10px] text-[#94A3B8] hover:text-[#334155] px-1 rounded hover:bg-[#E2E8F0]"
                >
                  + 폴더
                </button>
                <button
                  type="button"
                  onClick={() => void openNewPresetModal(null)}
                  title={section === 'collaborative' ? '새 공유 뷰' : '새 뷰'}
                  className="text-[10px] text-[#94A3B8] hover:text-[#334155] px-1 rounded hover:bg-[#E2E8F0]"
                >
                  + 뷰
                </button>
              </div>
            ) : null
          }
        >
          {label}
        </SectionLabel>
        <div
          className="relative px-2 pb-1"
          onDragOver={overSectionBg(section)}
          onDragLeave={leaveSectionBg}
          onDrop={e => { e.preventDefault(); executeDrop(section) }}
        >
          {!activePresetKey && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
              뷰를 지원하지 않는 페이지입니다
            </div>
          )}
          {activePresetKey && rows.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
              {section === 'collaborative' ? '공유된 뷰가 없습니다' : '저장된 뷰가 없습니다'}
            </div>
          )}

          {rows.map(row => {
            if (row.kind === 'folder') {
              const folder = row.folder
              const mine = isMine(folder.owner_user_key)
              const open = !collapsedFolders.has(folder.id)
              const dropLine =
                dropTarget && (dropTarget.kind === 'above-row' || dropTarget.kind === 'below-row') &&
                dropTarget.rowId === folder.id
                  ? (dropTarget.kind === 'above-row' ? 'above' : 'below')
                  : null
              const dropInto =
                dropTarget?.kind === 'into-folder' && dropTarget.folderId === folder.id
              return (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  ownedByMe={mine}
                  open={open}
                  onToggle={() => toggleFolder(folder.id)}
                  onRename={next => void handleRenameFolder(folder, next)}
                  renaming={renamingFolderId === folder.id}
                  onRequestRename={() => setRenamingFolderId(folder.id)}
                  onCancelRename={() => setRenamingFolderId(null)}
                  draggable={mine}
                  isDragging={drag?.kind === 'folder' && drag.id === folder.id}
                  dropLinePosition={dropLine}
                  dropInto={dropInto}
                  onDragStart={mine ? startFolderDrag(folder) : undefined}
                  onDragOver={overFolderRow(folder)}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); executeDrop(section) }}
                  onDragEnd={endDrag}
                  onContextMenu={e => openFolderMenu(folder, e)}
                />
              )
            }

            const preset = row.preset
            // Skip members of a collapsed folder.
            if (row.folderId && collapsedFolders.has(row.folderId)) return null
            const pMine = isMine(preset.owner_user_key)
            const dropLine =
              dropTarget && (dropTarget.kind === 'above-row' || dropTarget.kind === 'below-row') &&
              dropTarget.rowId === preset.id
                ? (dropTarget.kind === 'above-row' ? 'above' : 'below')
                : null
            const memberOfDraggedFolder =
              folderBlockBeingDragged !== null && row.folderId === folderBlockBeingDragged
            return (
              <PresetRow
                key={preset.id}
                preset={preset}
                active={activePresetId === preset.id}
                ownedByMe={pMine}
                indented={!!row.folderId}
                onApply={() => handleApplyPreset(preset)}
                onToggleStar={pMine ? () => void handleToggleStar(preset) : undefined}
                onCopyToMine={!pMine ? () => void handleCopyToMine(preset) : undefined}
                onRename={next => void handleRenamePreset(preset, next)}
                renaming={renamingPresetId === preset.id}
                onRequestRename={() => setRenamingPresetId(preset.id)}
                onCancelRename={() => setRenamingPresetId(null)}
                draggable={pMine}
                isDragging={
                  (drag?.kind === 'preset' && drag.id === preset.id) || memberOfDraggedFolder
                }
                dropLinePosition={dropLine}
                onDragStart={pMine ? startPresetDrag(preset) : undefined}
                onDragOver={overPresetRow(row)}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); executeDrop(section) }}
                onDragEnd={endDrag}
                onContextMenu={e => openPresetMenu(preset, e)}
              />
            )
          })}

          {/* Bottom drop zone — explicit landing pad to pull items out
              of a folder to the section bottom. Visible only during a
              drag in this section so it doesn't clutter the nav. */}
          {dragging && (
            <div
              onDragOver={overSectionBottom(section)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); executeDrop(section) }}
              className={`mt-1 h-[28px] rounded-[6px] border-2 border-dashed flex items-center justify-center text-[10px] transition-colors ${
                bottomActive
                  ? 'border-[#2D7FF9] bg-[#EFF6FF] text-[#2D7FF9]'
                  : 'border-[#CBD5E1] text-[#94A3B8]'
              }`}
            >
              하단으로 이동
            </div>
          )}
        </div>
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

  return (
    <aside
      data-worksy-lnb
      className={`flex-shrink-0 ${widthClass} ${transitionClass} h-full border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-hidden`}
    >
      <div data-worksy-lnb-toggle className="flex items-center justify-end px-2 pt-2 pb-1 flex-shrink-0">
        <ToggleButton collapsed={collapsed} onToggle={onToggle} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* 즐겨찾기 */}
        <SectionLabel>즐겨찾기</SectionLabel>
        <div className="px-2 pb-1">
          {starredPresets.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
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
                onCopyToMine={!mine ? () => void handleCopyToMine(p) : undefined}
                onContextMenu={e => openPresetMenu(p, e)}
              />
            )
          })}
        </div>

        <Divider />

        {renderPresetSection('collaborative', '공유 뷰', sharedRows)}

        <Divider />

        {renderPresetSection('private', '내 뷰', privateRows)}

        <Divider />

        {/* 페이지 목록 */}
        <SectionLabel>페이지</SectionLabel>
        <nav className="flex flex-col gap-0.5 px-2 pb-2">
          {WORKS_PAGES.map(p => {
            const isActive = p.key === activeKey
            const isComingSoon = p.status === 'coming-soon'
            if (isComingSoon) {
              return (
                <div
                  key={p.key}
                  title="준비중"
                  className="flex items-center justify-between rounded-[6px] px-2 py-1.5 text-[13px] text-[#94A3B8] cursor-not-allowed"
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] rounded-[3px] bg-[#E2E8F0] px-1.5 py-0.5 text-[#64748B]">준비중</span>
                </div>
              )
            }
            return (
              <Link
                key={p.key}
                href={p.href ?? '#'}
                className={`rounded-[6px] px-2 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[#2D7FF9] text-white font-medium'
                    : 'text-[#334155] hover:bg-[#E2E8F0]'
                }`}
              >
                {p.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* 휴지통 — pinned bottom */}
      <div className="flex-shrink-0">
        <Divider />
        <nav className="flex flex-col px-2 pb-3">
          <Link
            href={TRASH_PAGE.href ?? '#'}
            className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] transition-colors ${
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
        onCancel={() => { if (!saving) { setModalOpen(false); setSnapshot(null); setModalTargetFolderId(null) } }}
        onSubmit={handleSubmitPreset}
      />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  )
}
