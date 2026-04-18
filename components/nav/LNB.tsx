'use client'

// Left Nav Bar — per-workspace navigation. 220px column on the left
// edge of every /works route, collapsible to a 36px rail.
//
// Section order (top → bottom):
//   1. 즐겨찾기   — starred presets (cross-page, read-only pins)
//   2. 공유 뷰    — collaborative presets + folders for active page
//   3. 내 뷰      — private presets + folders for active page
//   4. 페이지     — static page list from WORKS_PAGES
//   5. 휴지통     — pinned to the bottom with a trash icon; a divider
//                  above it separates it from the scrolling content.
//
// Ownership model on collaborative rows:
//   - Everyone sees the row.
//   - Only the owner sees star / delete / drag-handle / rename
//     affordances. Non-owners see a "내 뷰로 복사" option in the
//     right-click menu that POSTs a new private preset with the same
//     filters/sort/view.
//
// Folders: a preset can be filed inside a folder (folder_id FK). When
// a folder is collapsed, its nested presets hide. Folder collapse
// state is localStorage-scoped and per-id so it survives reload. The
// +폴더 button appends a new folder to the active section. Folder
// rename is via double-click; folder delete is via the right-click
// menu and detaches (does NOT cascade-delete) any contained presets.

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
  reorderFolders,
  reorderPresets,
  snapshotLiveView,
  updateFolder,
  updatePreset,
  type PresetScope,
  type ViewFolder,
  type ViewPreset,
} from '@/lib/works/viewPresets'
import NewPresetModal from './NewPresetModal'

// ── Page key mapping ────────────────────────────────────────────────
// presets/folders are keyed by the legacy page_key; nav pages use the
// newer slug. Keep aligned with worksPageConfig.
function presetKeyForActivePage(activeKey: string | null): string | null {
  if (activeKey === 'production') return 'works'
  if (activeKey === 'trash') return 'works-trash'
  return null
}

// ── Collapse persistence ────────────────────────────────────────────
// Folder open/closed state per id, stored in localStorage. Default is
// expanded (so new folders with no LS entry render open).
const FOLDER_COLLAPSE_LS = 'works:folder-collapsed'
function readFolderCollapseSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(FOLDER_COLLAPSE_LS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [])
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

// ── Right-click context menu ────────────────────────────────────────
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
    // Defer so the triggering contextmenu event doesn't immediately close us.
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

// ── Preset row ──────────────────────────────────────────────────────
type DragData =
  | { kind: 'preset'; id: string }
  | { kind: 'folder'; id: string; section: PresetScope }
type DropTarget =
  | { kind: 'preset'; id: string; position: 'above' | 'below' }
  | { kind: 'folder-row'; id: string; position: 'above' | 'below' }
  | { kind: 'folder-into'; id: string }
  | { kind: 'section'; section: PresetScope }

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
  const showShareTag = preset.scope === 'collaborative' && ownedByMe

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
          className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-[#0EA5E9] bg-[#E0F2FE] rounded-[3px] px-1 py-px"
          title="팀 공유 뷰"
        >
          공유
        </span>
      )}

      {!ownedByMe && onCopyToMine && !renaming && (
        <span
          className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider text-[#64748B] bg-[#E2E8F0] rounded-[3px] px-1 py-px"
          title="다른 사람의 뷰"
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
    </div>
  )
}

// ── Folder row ──────────────────────────────────────────────────────
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

// ── Props ───────────────────────────────────────────────────────────
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

  const starredPresets = useMemo(() => presets.filter(p => p.starred), [presets])
  const pagePresets = useMemo(
    () => activePresetKey ? presets.filter(p => p.page_key === activePresetKey) : [],
    [presets, activePresetKey],
  )
  const pageFolders = useMemo(
    () => activePresetKey ? folders.filter(f => f.page_key === activePresetKey) : [],
    [folders, activePresetKey],
  )

  // Split by scope for the two middle sections.
  const sharedPresets = useMemo(() => pagePresets.filter(p => p.scope === 'collaborative'), [pagePresets])
  const privatePresets = useMemo(() => pagePresets.filter(p => p.scope === 'private' && isMine(p.owner_user_key)), [pagePresets, isMine])
  const sharedFolders = useMemo(() => pageFolders.filter(f => f.scope === 'collaborative'), [pageFolders])
  const privateFolders = useMemo(() => pageFolders.filter(f => f.scope === 'private' && isMine(f.owner_user_key)), [pageFolders, isMine])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTargetFolderId, setModalTargetFolderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [snapshot, setSnapshot] = useState<{
    filters: unknown
    sort: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any
  } | null>(null)

  // Rename state (preset / folder). Mutually exclusive.
  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)

  // Folder collapse state
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

  // Context menu state
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  // ── Drag state ─────────────────────────────────────────────────────
  const [drag, setDrag] = useState<DragData | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  // Optimistic order override for each list we reorder.
  const [optPresetOrder, setOptPresetOrder] = useState<Record<PresetScope, string[] | null>>({
    private: null, collaborative: null,
  })
  const [optFolderOrder, setOptFolderOrder] = useState<Record<PresetScope, string[] | null>>({
    private: null, collaborative: null,
  })

  // ── Helpers: grouping presets by folder per section ───────────────
  type Grouped = { topLevel: ViewPreset[]; byFolder: Record<string, ViewPreset[]> }
  const groupPresets = useCallback((list: ViewPreset[]): Grouped => {
    const topLevel: ViewPreset[] = []
    const byFolder: Record<string, ViewPreset[]> = {}
    for (const p of list) {
      if (p.folder_id) {
        if (!byFolder[p.folder_id]) byFolder[p.folder_id] = []
        byFolder[p.folder_id].push(p)
      } else {
        topLevel.push(p)
      }
    }
    return { topLevel, byFolder }
  }, [])

  // Apply optimistic preset order within a section (both top-level
  // and folder members are reordered by the same id list).
  const applyOptPresetOrder = useCallback((list: ViewPreset[], section: PresetScope): ViewPreset[] => {
    const order = optPresetOrder[section]
    if (!order) return list
    const byId = new Map(list.map(p => [p.id, p]))
    const out: ViewPreset[] = []
    for (const id of order) {
      const p = byId.get(id)
      if (p) { out.push(p); byId.delete(id) }
    }
    byId.forEach(p => out.push(p))
    return out
  }, [optPresetOrder])

  const applyOptFolderOrder = useCallback((list: ViewFolder[], section: PresetScope): ViewFolder[] => {
    const order = optFolderOrder[section]
    if (!order) return list
    const byId = new Map(list.map(f => [f.id, f]))
    const out: ViewFolder[] = []
    for (const id of order) {
      const f = byId.get(id)
      if (f) { out.push(f); byId.delete(id) }
    }
    byId.forEach(f => out.push(f))
    return out
  }, [optFolderOrder])

  const orderedShared = useMemo(() => applyOptPresetOrder(sharedPresets, 'collaborative'), [sharedPresets, applyOptPresetOrder])
  const orderedPrivate = useMemo(() => applyOptPresetOrder(privatePresets, 'private'), [privatePresets, applyOptPresetOrder])
  const orderedSharedFolders = useMemo(() => applyOptFolderOrder(sharedFolders, 'collaborative'), [sharedFolders, applyOptFolderOrder])
  const orderedPrivateFolders = useMemo(() => applyOptFolderOrder(privateFolders, 'private'), [privateFolders, applyOptFolderOrder])

  // ── Modal submit / create preset ──────────────────────────────────
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

  // Scope toggle: private → collaborative (share with team) or
  // collaborative → private (unshare). Owner-only. The PATCH endpoint
  // already supports scope; here we just surface the affordance and
  // re-fetch so LNB relocates the row into the correct section.
  const handleToggleScope = async (preset: ViewPreset) => {
    const next: PresetScope = preset.scope === 'collaborative' ? 'private' : 'collaborative'
    if (next === 'collaborative') {
      if (!window.confirm(`'${preset.name}' 뷰를 팀에 공유할까요? 팀원 모두가 볼 수 있습니다.`)) return
    } else {
      if (!window.confirm(`'${preset.name}' 뷰를 개인 뷰로 전환할까요? 팀원에게 더 이상 보이지 않습니다.`)) return
    }
    // When moving out of a shared folder (or into private), we also
    // detach from the folder if the folder scope no longer matches.
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
    if (!activePresetKey) return
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

  // ── Folder actions ───────────────────────────────────────────────
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
    // Immediately enter rename mode? We use the prompt result as name;
    // user can double-click later if they want to change.
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

  // ── Drag handlers ─────────────────────────────────────────────────
  const startPresetDrag = (preset: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    setDrag({ kind: 'preset', id: preset.id })
    try { e.dataTransfer.setData('text/plain', preset.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  const startFolderDrag = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    setDrag({ kind: 'folder', id: folder.id, section: folder.scope })
    try { e.dataTransfer.setData('text/plain', folder.id) } catch { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move'
  }

  // Hit-test rules (per UX spec):
  //   preset (non-folder item): top 40% → line above, bottom 40% →
  //     line below. Middle 20% is a quiet zone — we keep whichever
  //     indicator was last set so the user's commit isn't ambiguous
  //     but we also don't jitter mid-move.
  //   folder row (preset being dragged): top 40% → line above folder
  //     (drop as top-level sibling above), middle 20% → file INTO
  //     folder (ring highlight), bottom 40% → line below.
  //   folder row (folder being dragged = reorder): 50/50 above/below
  //     since "into" isn't meaningful for folders-into-folders.
  const overPresetRow = (target: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag) return
    // Folders can't drop onto preset rows.
    if (drag.kind !== 'preset') return
    if (drag.id === target.id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    const topZone = h * 0.4
    const bottomZone = h * 0.6
    // Quiet 20% middle band: don't change the indicator — keeps the
    // line from jittering while the cursor is mid-row.
    if (y >= topZone && y <= bottomZone) return
    const position: 'above' | 'below' = y < topZone ? 'above' : 'below'
    setDropTarget(prev =>
      prev && prev.kind === 'preset' && prev.id === target.id && prev.position === position
        ? prev
        : { kind: 'preset', id: target.id, position }
    )
  }

  const overFolderRow = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height

    if (drag.kind === 'folder') {
      // Folder-to-folder = reorder, no "into".
      if (drag.id === folder.id) return
      if (drag.section !== folder.scope) return
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

    // Preset drag over a folder — 40/20/40 split.
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

  const leaveRow = () => {
    // We don't clear aggressively; if the cursor moves to a new valid
    // target that handler will replace dropTarget. Aggressive clearing
    // causes flicker between rows.
  }

  // Drop onto a preset row — only reorders within the same section.
  const dropOnPresetRow = (target: ViewPreset) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const d = drag
    const t = dropTarget
    setDrag(null); setDropTarget(null)
    if (!d || d.kind !== 'preset') return
    if (d.id === target.id) return
    const section: PresetScope = target.scope
    // Only allow reorder if source preset is in the same section.
    const sourcePreset = presets.find(p => p.id === d.id)
    if (!sourcePreset || sourcePreset.scope !== section) return
    // Reorder within section: union of top-level + all folder members,
    // since sort_order is global per-section.
    const sectionList = section === 'collaborative' ? orderedShared : orderedPrivate
    const currentOrder = sectionList.map(p => p.id)
    const fromIdx = currentOrder.indexOf(d.id)
    const targetIdx = currentOrder.indexOf(target.id)
    if (fromIdx < 0 || targetIdx < 0) return
    const position = t && t.kind === 'preset' && t.id === target.id ? t.position : 'above'
    let insertAt = position === 'above' ? targetIdx : targetIdx + 1
    const nextOrder = currentOrder.slice()
    nextOrder.splice(fromIdx, 1)
    if (fromIdx < insertAt) insertAt -= 1
    nextOrder.splice(insertAt, 0, d.id)
    if (nextOrder.every((id, i) => id === currentOrder[i])) {
      // Same order but maybe moving across folder boundaries — if
      // source.folder_id != target.folder_id, treat as move.
      if (sourcePreset.folder_id !== target.folder_id) {
        const folderId = target.folder_id
        setOptPresetOrder(prev => ({ ...prev, [section]: nextOrder }))
        void (async () => {
          await updatePreset(d.id, { folder_id: folderId })
          await refresh()
          setOptPresetOrder(prev => ({ ...prev, [section]: null }))
        })()
      }
      return
    }

    setOptPresetOrder(prev => ({ ...prev, [section]: nextOrder }))
    const folderId = target.folder_id
    const folderChanged = sourcePreset.folder_id !== folderId
    void (async () => {
      if (folderChanged) await updatePreset(d.id, { folder_id: folderId })
      await reorderPresets(nextOrder)
      await refresh()
      setOptPresetOrder(prev => ({ ...prev, [section]: null }))
    })()
  }

  // Drop onto a folder row — either reorders folders or files a preset into it.
  const dropOnFolderRow = (folder: ViewFolder) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const d = drag
    const t = dropTarget
    setDrag(null); setDropTarget(null)
    if (!d) return

    if (d.kind === 'folder') {
      if (d.id === folder.id || d.section !== folder.scope) return
      const sectionList = folder.scope === 'collaborative' ? orderedSharedFolders : orderedPrivateFolders
      const currentOrder = sectionList.map(f => f.id)
      const fromIdx = currentOrder.indexOf(d.id)
      const targetIdx = currentOrder.indexOf(folder.id)
      if (fromIdx < 0 || targetIdx < 0) return
      const position = t && t.kind === 'folder-row' && t.id === folder.id ? t.position : 'above'
      let insertAt = position === 'above' ? targetIdx : targetIdx + 1
      const nextOrder = currentOrder.slice()
      nextOrder.splice(fromIdx, 1)
      if (fromIdx < insertAt) insertAt -= 1
      nextOrder.splice(insertAt, 0, d.id)
      if (nextOrder.every((id, i) => id === currentOrder[i])) return
      setOptFolderOrder(prev => ({ ...prev, [folder.scope]: nextOrder }))
      void (async () => {
        await reorderFolders(nextOrder)
        await refresh()
        setOptFolderOrder(prev => ({ ...prev, [folder.scope]: null }))
      })()
      return
    }

    // Preset dropped on a folder row. Two cases, distinguished by the
    // indicator position at drop time:
    //   folder-into  → file preset inside the folder (folder_id = folder.id)
    //   folder-row   → drop as a top-level sibling (folder_id = null).
    //                  Positioning within top-level isn't tracked here;
    //                  the row appears at its current sort_order after refresh.
    if (d.kind === 'preset') {
      const source = presets.find(p => p.id === d.id)
      if (!source) return
      // Scope guard: a private preset may only interact with a private
      // folder (and vice versa). Keeps sort_order pools disjoint.
      if (source.scope !== folder.scope) {
        window.alert('공개 범위가 다른 폴더에는 이동할 수 없습니다')
        return
      }
      const intoFolder = t?.kind === 'folder-into' && t.id === folder.id
      const targetFolderId = intoFolder ? folder.id : null
      if (source.folder_id === targetFolderId) return
      void (async () => {
        await updatePreset(d.id, { folder_id: targetFolderId })
        await refresh()
      })()
    }
  }

  // Drop on empty section area → move preset to top-level (folder_id=null).
  const overSection = (section: PresetScope) => (e: React.DragEvent<HTMLDivElement>) => {
    if (!drag || drag.kind !== 'preset') return
    const source = presets.find(p => p.id === drag.id)
    if (!source || source.scope !== section) return
    // Only highlight the section if the source is currently in a folder;
    // dragging within top-level already handled by preset-row handler.
    if (!source.folder_id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(prev =>
      prev && prev.kind === 'section' && prev.section === section
        ? prev
        : { kind: 'section', section }
    )
  }
  const dropOnSection = (section: PresetScope) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const d = drag
    setDrag(null); setDropTarget(null)
    if (!d || d.kind !== 'preset') return
    const source = presets.find(p => p.id === d.id)
    if (!source || source.scope !== section || !source.folder_id) return
    void (async () => {
      await updatePreset(d.id, { folder_id: null })
      await refresh()
    })()
  }

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

  // ── Render helpers ────────────────────────────────────────────────
  const renderPresetSection = (
    section: PresetScope,
    label: string,
    presetsList: ViewPreset[],
    foldersList: ViewFolder[],
  ) => {
    const grouped = groupPresets(presetsList)
    const canCreate = !!activePresetKey
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
          className={`relative px-2 pb-1 ${dropTarget?.kind === 'section' && dropTarget.section === section ? 'bg-[#EFF6FF] rounded-[6px]' : ''}`}
          onDragOver={overSection(section)}
          onDrop={dropOnSection(section)}
        >
          {/* Section-level drop indicator: a 2px blue line flush with
              the bottom edge of this section's content area. Signals
              "drop here → preset becomes a top-level row in this
              section" when the user drags out of a folder. */}
          {dropTarget?.kind === 'section' && dropTarget.section === section && (
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
          {activePresetKey && presetsList.length === 0 && foldersList.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
              {section === 'collaborative' ? '공유된 뷰가 없습니다' : '저장된 뷰가 없습니다'}
            </div>
          )}

          {/* Folders first, then top-level presets. */}
          {foldersList.map(folder => {
            const mine = isMine(folder.owner_user_key)
            const open = !collapsedFolders.has(folder.id)
            const members = grouped.byFolder[folder.id] ?? []
            const folderDropLine =
              dropTarget?.kind === 'folder-row' && dropTarget.id === folder.id
                ? dropTarget.position
                : null
            const folderDropInto =
              dropTarget?.kind === 'folder-into' && dropTarget.id === folder.id
            return (
              <div key={folder.id}>
                <FolderRow
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
                  onDragLeave={leaveRow}
                  onDrop={dropOnFolderRow(folder)}
                  onDragEnd={endDrag}
                  onContextMenu={e => openFolderMenu(folder, e)}
                />
                {open && members.map(p => {
                  const pMine = isMine(p.owner_user_key)
                  const dropLine =
                    dropTarget?.kind === 'preset' && dropTarget.id === p.id
                      ? dropTarget.position
                      : null
                  return (
                    <PresetRow
                      key={p.id}
                      preset={p}
                      active={activePresetId === p.id}
                      ownedByMe={pMine}
                      indented
                      onApply={() => handleApplyPreset(p)}
                      onToggleStar={pMine ? () => void handleToggleStar(p) : undefined}
                      onDelete={pMine ? () => void handleDeletePreset(p) : undefined}
                      onCopyToMine={!pMine ? () => void handleCopyToMine(p) : undefined}
                      onRename={next => void handleRenamePreset(p, next)}
                      renaming={renamingPresetId === p.id}
                      onRequestRename={() => setRenamingPresetId(p.id)}
                      onCancelRename={() => setRenamingPresetId(null)}
                      draggable={pMine}
                      isDragging={drag?.kind === 'preset' && drag.id === p.id}
                      dropLinePosition={dropLine}
                      onDragStart={pMine ? startPresetDrag(p) : undefined}
                      onDragOver={overPresetRow(p)}
                      onDragLeave={leaveRow}
                      onDrop={dropOnPresetRow(p)}
                      onDragEnd={endDrag}
                      onContextMenu={e => openPresetMenu(p, e)}
                    />
                  )
                })}
              </div>
            )
          })}

          {grouped.topLevel.map(p => {
            const pMine = isMine(p.owner_user_key)
            const dropLine =
              dropTarget?.kind === 'preset' && dropTarget.id === p.id
                ? dropTarget.position
                : null
            return (
              <PresetRow
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                ownedByMe={pMine}
                onApply={() => handleApplyPreset(p)}
                onToggleStar={pMine ? () => void handleToggleStar(p) : undefined}
                onDelete={pMine ? () => void handleDeletePreset(p) : undefined}
                onCopyToMine={!pMine ? () => void handleCopyToMine(p) : undefined}
                onRename={next => void handleRenamePreset(p, next)}
                renaming={renamingPresetId === p.id}
                onRequestRename={() => setRenamingPresetId(p.id)}
                onCancelRename={() => setRenamingPresetId(null)}
                draggable={pMine}
                isDragging={drag?.kind === 'preset' && drag.id === p.id}
                dropLinePosition={dropLine}
                onDragStart={pMine ? startPresetDrag(p) : undefined}
                onDragOver={overPresetRow(p)}
                onDragLeave={leaveRow}
                onDrop={dropOnPresetRow(p)}
                onDragEnd={endDrag}
                onContextMenu={e => openPresetMenu(p, e)}
              />
            )
          })}
        </div>
      </>
    )
  }

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

      {/* Scrolling content: everything except the bottom 휴지통 pin. */}
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

        {/* 공유 뷰 */}
        {renderPresetSection('collaborative', '공유 뷰', orderedShared, orderedSharedFolders)}

        <Divider />

        {/* 내 뷰 */}
        {renderPresetSection('private', '내 뷰', orderedPrivate, orderedPrivateFolders)}

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

      {/* 휴지통 — pinned to bottom with a divider above. flex-shrink-0
          keeps it fixed while the section above scrolls. */}
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
