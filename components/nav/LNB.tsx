'use client'

// Left Nav Bar — per-workspace navigation. 220px column on the left
// edge of every /works route, collapsible to a 36px rail.
//
// Section layout (top → bottom):
//   1. 즐겨찾기 — starred presets (cross-page pins)
//   2. 공유 뷰  — collaborative presets + folders for active page.
//                TOP-LEVEL presets render FIRST (above folders) so
//                that dropping a preset "above a folder row" lands
//                it at a slot that actually exists in the layout.
//   3. 내 뷰    — private presets + folders for active page
//   4. 페이지   — static page list from WORKS_PAGES
//   5. 휴지통   — pinned to the bottom with a trash icon; a divider
//                above it separates it from the scrolling content.
//
// ── Drag-and-drop model ────────────────────────────────────────────
// A section is modeled as a FLAT ordered list of rows:
//   [ top-level preset, ... ][ folder, member, member, ... folder, ... ]
//
// On drop we:
//   1. Compute an `insertAt` index into this flat list from the drop
//      target (row + above/below, or "into folder", or end-of-section).
//   2. Splice the dragged row (or folder block) into the new index.
//   3. Walk the spliced flat list and assign each preset a new
//      (folder_id, sort_order) based on the folder row that most
//      recently preceded it, and each folder a new sort_order. This
//      deterministically encodes the visual order as DB state.
//   4. Apply the derived state as a LOCAL OVERRIDE (optimistic) so
//      the UI shifts immediately, then fire PATCHes for every changed
//      row in parallel, then refresh() and clear the override.
//
// If any PATCH fails, we alert the user and fall back to the
// server-confirmed state from refresh().
//
// Ownership: only the owner can drag/star/rename/delete a row.
// Non-owners see a "내 뷰로 복사" option in the right-click menu on
// collaborative rows. The server enforces ownership via
// owner_user_key equality on every update.

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

type DropTarget =
  | { kind: 'preset'; id: string; position: 'above' | 'below' }
  | { kind: 'folder-row'; id: string; position: 'above' | 'below' }
  | { kind: 'folder-into'; id: string }
  | { kind: 'section'; section: PresetScope }

type FlatRow =
  | { kind: 'folder'; id: string; folder: ViewFolder }
  | { kind: 'preset'; id: string; preset: ViewPreset; inFolder: string | null }

// ── Preset / folder rows ────────────────────────────────────────────
type PresetRowProps = {
  preset: ViewPreset
  active: boolean
  ownedByMe: boolean
  indented?: boolean
  onApply: () => void
  onToggleStar?: () => void
  onDelete?: () => void
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
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function PresetRow({
  preset, active, ownedByMe, indented,
  onApply, onToggleStar, onDelete, onCopyToMine,
  onRename, renaming, onRequestRename, onCancelRename,
  draggable, isDragging, dropLinePosition,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onContextMenu,
}: PresetRowProps) {
  const [editName, setEditName] = useState(preset.name)
  useEffect(() => { if (renaming) setEditName(preset.name) }, [renaming, preset.name])
  const showStar = ownedByMe && onToggleStar != null
  const showDelete = ownedByMe && onDelete != null
  const showShareTag = preset.scope === 'collaborative'

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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
      {draggable ? (
        <span
          aria-label="순서 변경"
          title="드래그하여 이동"
          className="flex-shrink-0 flex items-center justify-center w-[12px] h-[16px] text-[#CBD5E1] group-hover:text-[#64748B] cursor-grab active:cursor-grabbing"
        >
          <DragHandleIcon />
        </span>
      ) : (
        <span className="flex-shrink-0 w-[12px] h-[16px]" aria-hidden="true" />
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

      {showDelete && !renaming && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete?.() }}
          aria-label="뷰 삭제"
          className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#CBD5E1] text-[#94A3B8] hover:text-[#EF4444]"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6"/>
          </svg>
        </button>
      )}
      {/* unused prop to silence lints; copy flow is exposed via right-click menu */}
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
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function FolderRow({
  folder, ownedByMe, open, onToggle,
  onRename, renaming, onRequestRename, onCancelRename,
  draggable, isDragging, dropLinePosition, dropInto,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onContextMenu,
}: FolderRowProps) {
  const [editName, setEditName] = useState(folder.name)
  useEffect(() => { if (renaming) setEditName(folder.name) }, [renaming, folder.name])

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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
      {draggable ? (
        <span
          aria-label="폴더 순서 변경"
          title="드래그하여 폴더 순서 변경"
          className="flex-shrink-0 flex items-center justify-center w-[12px] h-[16px] text-[#CBD5E1] group-hover:text-[#64748B] cursor-grab active:cursor-grabbing"
        >
          <DragHandleIcon />
        </span>
      ) : (
        <span className="flex-shrink-0 w-[12px] h-[16px]" aria-hidden="true" />
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

// ── Helpers ────────────────────────────────────────────────────────
type OrderableRow = { sort_order: number | null; created_at: string }
function byOrder<T extends OrderableRow>(a: T, b: T): number {
  const ao = a.sort_order ?? Number.POSITIVE_INFINITY
  const bo = b.sort_order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo
  return a.created_at.localeCompare(b.created_at)
}

// Build the flat row list for a section: top-level presets first,
// then folders with their members. Indices in this list are the
// insertion slots the drop handlers use.
function buildFlat(
  sectionPresets: ViewPreset[],
  sectionFolders: ViewFolder[],
): FlatRow[] {
  const sortedPresets = [...sectionPresets].sort(byOrder)
  const sortedFolders = [...sectionFolders].sort(byOrder)
  const flat: FlatRow[] = []
  for (const p of sortedPresets.filter(p => !p.folder_id)) {
    flat.push({ kind: 'preset', id: p.id, preset: p, inFolder: null })
  }
  for (const f of sortedFolders) {
    flat.push({ kind: 'folder', id: f.id, folder: f })
    for (const m of sortedPresets.filter(p => p.folder_id === f.id)) {
      flat.push({ kind: 'preset', id: m.id, preset: m, inFolder: f.id })
    }
  }
  return flat
}

// Walk the flat list and derive each row's (folder_id, sort_order).
// A preset's folder_id is the id of the most recent folder row that
// precedes it; presets before any folder row are top-level (null).
type DerivedState = {
  presets: Map<string, { folder_id: string | null; sort_order: number }>
  folders: Map<string, { sort_order: number }>
}
function deriveState(flat: FlatRow[]): DerivedState {
  let currentFolder: string | null = null
  let presetIdx = 0
  let folderIdx = 0
  const presets = new Map<string, { folder_id: string | null; sort_order: number }>()
  const folders = new Map<string, { sort_order: number }>()
  for (const r of flat) {
    if (r.kind === 'folder') {
      currentFolder = r.folder.id
      folders.set(r.folder.id, { sort_order: folderIdx++ })
    } else {
      presets.set(r.preset.id, { folder_id: currentFolder, sort_order: presetIdx++ })
    }
  }
  return { presets, folders }
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
  // When a drop commits we set this immediately; the visible list uses
  // the override-merged data. Cleared after refresh() confirms the
  // server has accepted the new state (or we roll back on failure).
  const [override, setOverride] = useState<DerivedState | null>(null)

  const overriddenPresets = useMemo(() => {
    if (!override) return presets
    return presets.map(p => {
      const o = override.presets.get(p.id)
      return o ? { ...p, folder_id: o.folder_id, sort_order: o.sort_order } : p
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

  const sharedFlat = useMemo(() => buildFlat(sharedPresets, sharedFolders), [sharedPresets, sharedFolders])
  const privateFlat = useMemo(() => buildFlat(privatePresets, privateFolders), [privatePresets, privateFolders])

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

  // ── Drag state ────────────────────────────────────────────────────
  const [drag, setDrag] = useState<DragData | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

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

  // ── Unified drop commit ───────────────────────────────────────────
  // Splices the dragged row (or folder-block) into the flat list,
  // derives the new (folder_id, sort_order) map, applies it as an
  // optimistic override, and issues PATCHes only for rows whose
  // state actually changed. After all PATCHes resolve (or any
  // reject), we refresh from the server and clear the override.
  const commitFlat = useCallback((section: PresetScope, newFlat: FlatRow[]) => {
    const derived = deriveState(newFlat)
    setOverride(derived)

    const patches: Array<Promise<unknown>> = []
    derived.presets.forEach((state, id) => {
      const orig = presets.find(p => p.id === id)
      if (!orig) return
      const sameFolder = orig.folder_id === state.folder_id
      const sameOrder = (orig.sort_order ?? -1) === state.sort_order
      if (!sameFolder || !sameOrder) {
        patches.push(updatePreset(id, {
          folder_id: state.folder_id,
          sort_order: state.sort_order,
        }))
      }
    })
    derived.folders.forEach((state, id) => {
      const orig = folders.find(f => f.id === id)
      if (!orig) return
      if ((orig.sort_order ?? -1) !== state.sort_order) {
        patches.push(updateFolder(id, { sort_order: state.sort_order }))
      }
    })
    if (patches.length === 0) {
      setOverride(null)
      return
    }

    void (async () => {
      try {
        const results = await Promise.all(patches)
        const anyFailed = results.some(r => r == null)
        if (anyFailed) window.alert('일부 항목 저장에 실패했습니다. 원래 상태로 되돌립니다.')
      } catch {
        window.alert('저장 중 오류가 발생했습니다. 원래 상태로 되돌립니다.')
      } finally {
        await refresh()
        setOverride(null)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets, folders, refresh])

  // Splice a preset into the flat list at a new insertion index.
  const dropPreset = useCallback((section: PresetScope, presetId: string, insertAt: number) => {
    const flat = section === 'collaborative' ? sharedFlat.slice() : privateFlat.slice()
    const dragIdx = flat.findIndex(r => r.kind === 'preset' && r.id === presetId)
    if (dragIdx < 0) return
    const [dragged] = flat.splice(dragIdx, 1)
    const adjusted = dragIdx < insertAt ? insertAt - 1 : insertAt
    flat.splice(adjusted, 0, dragged)
    // Compare adjusted flat to original — if identical AND folder_id
    // assignment doesn't change (because target slot has same context),
    // commitFlat will skip API calls anyway.
    commitFlat(section, flat)
  }, [sharedFlat, privateFlat, commitFlat])

  // Splice a folder (plus its member block) to a new insertion index.
  const dropFolder = useCallback((section: PresetScope, folderId: string, insertAt: number) => {
    const flat = section === 'collaborative' ? sharedFlat.slice() : privateFlat.slice()
    const dragIdx = flat.findIndex(r => r.kind === 'folder' && r.id === folderId)
    if (dragIdx < 0) return
    // Block = folder row plus all contiguous member rows immediately after it.
    let blockEnd = dragIdx + 1
    while (
      blockEnd < flat.length &&
      flat[blockEnd].kind === 'preset' &&
      (flat[blockEnd] as Extract<FlatRow, { kind: 'preset' }>).inFolder === folderId
    ) blockEnd++
    // Cannot drop inside own block.
    if (insertAt > dragIdx && insertAt <= blockEnd) return
    const blockSize = blockEnd - dragIdx
    const block = flat.splice(dragIdx, blockSize)
    const adjusted = insertAt > dragIdx ? insertAt - blockSize : insertAt
    flat.splice(adjusted, 0, ...block)
    commitFlat(section, flat)
  }, [sharedFlat, privateFlat, commitFlat])

  // ── Drag event handlers ───────────────────────────────────────────
  const startPresetDrag = (preset: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    setDrag({ kind: 'preset', id: preset.id, section: preset.scope })
    try { e.dataTransfer.setData('text/plain', preset.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  const startFolderDrag = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    setDrag({ kind: 'folder', id: folder.id, section: folder.scope })
    try { e.dataTransfer.setData('text/plain', folder.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  // Preset rows receive preset drags only; folder-drags ignore them.
  const overPresetRow = (target: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag) return
    if (drag.kind !== 'preset') return
    if (drag.id === target.id) return
    if (drag.section !== target.scope) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    // 40/20/40 — middle 20% is a quiet band to avoid jitter.
    const topZone = h * 0.4
    const bottomZone = h * 0.6
    if (y >= topZone && y <= bottomZone) return
    const position: 'above' | 'below' = y < topZone ? 'above' : 'below'
    setDropTarget(prev =>
      prev && prev.kind === 'preset' && prev.id === target.id && prev.position === position
        ? prev
        : { kind: 'preset', id: target.id, position }
    )
  }

  // Folder rows accept both preset drags (above/into/below) and
  // folder drags (reorder with above/below only).
  const overFolderRow = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag) return
    if (drag.section !== folder.scope) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height

    if (drag.kind === 'folder') {
      if (drag.id === folder.id) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const position: 'above' | 'below' = y < h / 2 ? 'above' : 'below'
      setDropTarget(prev =>
        prev && prev.kind === 'folder-row' && prev.id === folder.id && prev.position === position
          ? prev
          : { kind: 'folder-row', id: folder.id, position }
      )
      return
    }

    // Preset over folder row — 40/20/40.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const topZone = h * 0.4
    const bottomZone = h * 0.6
    if (y < topZone) {
      setDropTarget(prev =>
        prev && prev.kind === 'folder-row' && prev.id === folder.id && prev.position === 'above'
          ? prev
          : { kind: 'folder-row', id: folder.id, position: 'above' }
      )
    } else if (y > bottomZone) {
      setDropTarget(prev =>
        prev && prev.kind === 'folder-row' && prev.id === folder.id && prev.position === 'below'
          ? prev
          : { kind: 'folder-row', id: folder.id, position: 'below' }
      )
    } else {
      setDropTarget(prev =>
        prev && prev.kind === 'folder-into' && prev.id === folder.id
          ? prev
          : { kind: 'folder-into', id: folder.id }
      )
    }
  }

  // Section background — always a valid preset drop (append to end of
  // the flat list). Enables "drag out of folder to section bottom".
  const overSectionBg = (section: PresetScope) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag || drag.kind !== 'preset') return
    if (drag.section !== section) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(prev =>
      prev && prev.kind === 'section' && prev.section === section
        ? prev
        : { kind: 'section', section }
    )
  }

  // Drop executors — translate current drop target into an insertAt
  // index and call dropPreset / dropFolder.
  const flatFor = (section: PresetScope) => section === 'collaborative' ? sharedFlat : privateFlat

  const executeDrop = useCallback((section: PresetScope) => {
    const d = drag
    const t = dropTarget
    setDrag(null); setDropTarget(null)
    if (!d || d.section !== section || !t) return
    const flat = flatFor(section)

    if (d.kind === 'preset') {
      let insertAt = -1
      if (t.kind === 'preset') {
        const idx = flat.findIndex(r => r.kind === 'preset' && r.id === t.id)
        if (idx < 0) return
        insertAt = t.position === 'above' ? idx : idx + 1
      } else if (t.kind === 'folder-row') {
        const idx = flat.findIndex(r => r.kind === 'folder' && r.id === t.id)
        if (idx < 0) return
        if (t.position === 'above') {
          insertAt = idx
        } else {
          // Just below folder row = end of its member block (last member).
          let j = idx + 1
          while (
            j < flat.length &&
            flat[j].kind === 'preset' &&
            (flat[j] as Extract<FlatRow, { kind: 'preset' }>).inFolder === t.id
          ) j++
          insertAt = j
        }
      } else if (t.kind === 'folder-into') {
        const idx = flat.findIndex(r => r.kind === 'folder' && r.id === t.id)
        if (idx < 0) return
        // End of members (appends to folder).
        let j = idx + 1
        while (
          j < flat.length &&
          flat[j].kind === 'preset' &&
          (flat[j] as Extract<FlatRow, { kind: 'preset' }>).inFolder === t.id
        ) j++
        insertAt = j
      } else if (t.kind === 'section') {
        insertAt = flat.length
      }
      if (insertAt < 0) return
      dropPreset(section, d.id, insertAt)
      return
    }

    // Folder drag — only folder-row targets apply.
    if (d.kind === 'folder') {
      if (t.kind !== 'folder-row') return
      const idx = flat.findIndex(r => r.kind === 'folder' && r.id === t.id)
      if (idx < 0) return
      let insertAt: number
      if (t.position === 'above') {
        insertAt = idx
      } else {
        // Just below the whole folder block.
        let j = idx + 1
        while (
          j < flat.length &&
          flat[j].kind === 'preset' &&
          (flat[j] as Extract<FlatRow, { kind: 'preset' }>).inFolder === t.id
        ) j++
        insertAt = j
      }
      dropFolder(section, d.id, insertAt)
    }
  }, [drag, dropTarget, sharedFlat, privateFlat, dropPreset, dropFolder])

  const endDrag = () => {
    setDrag(null)
    setDropTarget(null)
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
    flat: FlatRow[],
  ) => {
    const canCreate = !!activePresetKey
    const sectionHighlight = dropTarget?.kind === 'section' && dropTarget.section === section
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
          className={`relative px-2 pb-1 ${sectionHighlight ? 'bg-[#EFF6FF] rounded-[6px]' : ''}`}
          onDragOver={overSectionBg(section)}
          onDrop={() => executeDrop(section)}
        >
          {/* Bottom-of-section drop indicator line. */}
          {sectionHighlight && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-2 right-2 bottom-0 h-[2px] bg-[#2D7FF9]"
            />
          )}

          {!activePresetKey && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
              뷰를 지원하지 않는 페이지입니다
            </div>
          )}
          {activePresetKey && flat.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
              {section === 'collaborative' ? '공유된 뷰가 없습니다' : '저장된 뷰가 없습니다'}
            </div>
          )}

          {flat.map(row => {
            if (row.kind === 'folder') {
              const folder = row.folder
              const mine = isMine(folder.owner_user_key)
              const open = !collapsedFolders.has(folder.id)
              const folderDropLine =
                dropTarget?.kind === 'folder-row' && dropTarget.id === folder.id
                  ? dropTarget.position
                  : null
              const folderDropInto =
                dropTarget?.kind === 'folder-into' && dropTarget.id === folder.id
              // If this folder is collapsed, don't render its members
              // — but members still exist in the flat list, so we skip
              // them during render via the `open` gate below.
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
                  dropLinePosition={folderDropLine}
                  dropInto={folderDropInto}
                  onDragStart={mine ? startFolderDrag(folder) : undefined}
                  onDragOver={overFolderRow(folder)}
                  onDrop={() => executeDrop(section)}
                  onDragEnd={endDrag}
                  onContextMenu={e => openFolderMenu(folder, e)}
                />
              )
            }

            // Preset row. If it's a folder member and the folder is
            // collapsed, skip rendering.
            const preset = row.preset
            if (row.inFolder && collapsedFolders.has(row.inFolder)) return null
            const pMine = isMine(preset.owner_user_key)
            const dropLine =
              dropTarget?.kind === 'preset' && dropTarget.id === preset.id
                ? dropTarget.position
                : null
            return (
              <PresetRow
                key={preset.id}
                preset={preset}
                active={activePresetId === preset.id}
                ownedByMe={pMine}
                indented={!!row.inFolder}
                onApply={() => handleApplyPreset(preset)}
                onToggleStar={pMine ? () => void handleToggleStar(preset) : undefined}
                onDelete={pMine ? () => void handleDeletePreset(preset) : undefined}
                onCopyToMine={!pMine ? () => void handleCopyToMine(preset) : undefined}
                onRename={next => void handleRenamePreset(preset, next)}
                renaming={renamingPresetId === preset.id}
                onRequestRename={() => setRenamingPresetId(preset.id)}
                onCancelRename={() => setRenamingPresetId(null)}
                draggable={pMine}
                isDragging={drag?.kind === 'preset' && drag.id === preset.id}
                dropLinePosition={dropLine}
                onDragStart={pMine ? startPresetDrag(preset) : undefined}
                onDragOver={overPresetRow(preset)}
                onDrop={() => executeDrop(section)}
                onDragEnd={endDrag}
                onContextMenu={e => openPresetMenu(preset, e)}
              />
            )
          })}
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
                onDelete={mine ? () => void handleDeletePreset(p) : undefined}
                onCopyToMine={!mine ? () => void handleCopyToMine(p) : undefined}
                onContextMenu={e => openPresetMenu(p, e)}
              />
            )
          })}
        </div>

        <Divider />

        {renderPresetSection('collaborative', '공유 뷰', sharedFlat)}

        <Divider />

        {renderPresetSection('private', '내 뷰', privateFlat)}

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
