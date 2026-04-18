'use client'

// Left Nav Bar — per-workspace navigation. 220px column on the left
// edge of every /works route, collapsible to a 36px rail.
//
// Section order:
//   1. 즐겨찾기 — starred presets (cross-page). Starred presets ALSO
//      remain visible in their owning 현재 페이지 list — the star is a
//      pinning affordance, not a move.
//   2. 현재 페이지 — every preset scoped to the currently-active page,
//      plus a "+ 새 뷰" button that opens NewPresetModal. The preset
//      most recently applied/created is highlighted as "active".
//   3. 페이지 목록 — static list from WORKS_PAGES. Coming-soon pages
//      render muted; clicking them is a no-op.
//   4. 휴지통 — separate section, navigates to /works/trash.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  WORKS_PAGES,
  TRASH_PAGE,
  resolveActivePage,
} from '@/lib/nav/pages'
import { usePresets } from './PresetsContext'
import {
  applyPreset,
  createPreset,
  deletePreset,
  snapshotLiveView,
  updatePreset,
  type ViewPreset,
} from '@/lib/works/viewPresets'
import { loadSettings } from '@/lib/works/viewSettings'
import NewPresetModal from './NewPresetModal'

// Map from path-based active page → the pageKey stored on presets.
// 생산관리 presets use pageKey 'works' (legacy, matches worksPageConfig),
// 휴지통 uses 'works-trash' (worksTrashPageConfig). Keep this in sync
// with worksConfig.ts if those constants ever change.
function presetKeyForActivePage(activeKey: string | null): string | null {
  if (activeKey === 'production') return 'works'
  if (activeKey === 'trash') return 'works-trash'
  return null
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
      {children}
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

type PresetRowProps = {
  preset: ViewPreset
  active: boolean
  onApply: () => void
  onToggleStar: () => void
  onDelete: () => void
}

function PresetRow({ preset, active, onApply, onToggleStar, onDelete }: PresetRowProps) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-[6px] px-2 py-1 ${
        active ? 'bg-[#DBEAFE] hover:bg-[#BFDBFE]' : 'hover:bg-[#E2E8F0]'
      }`}
    >
      <button
        type="button"
        onClick={onToggleStar}
        aria-label={preset.starred ? '즐겨찾기 해제' : '즐겨찾기'}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[#CBD5E1]"
      >
        <StarIcon filled={preset.starred} />
      </button>
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
      <button
        type="button"
        onClick={onDelete}
        aria-label="뷰 삭제"
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#CBD5E1] text-[#94A3B8] hover:text-[#EF4444]"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M3 3l6 6M9 3l-6 6"/>
        </svg>
      </button>
    </div>
  )
}

type Props = {
  collapsed: boolean
  // Controls whether width transitions run. False on the very first paint
  // so users don't see an animation during hydration; true afterwards.
  animated: boolean
}

export default function LNB({ collapsed, animated }: Props) {
  const pathname = usePathname()
  const activePage = resolveActivePage(pathname ?? '')
  const activeKey = activePage?.key ?? null
  const activePresetKey = presetKeyForActivePage(activeKey)

  const { presets, refresh, activeByPage, setActivePreset } = usePresets()
  const activePresetId = activePresetKey ? (activeByPage[activePresetKey] ?? null) : null

  const starredPresets = useMemo(() => presets.filter(p => p.starred), [presets])
  // Starred presets stay in their page list too — starring is a pin, not
  // a move. The 즐겨찾기 section above just duplicates the pinned rows
  // at the top of the LNB.
  const currentPagePresets = useMemo(
    () => activePresetKey ? presets.filter(p => p.page_key === activePresetKey) : [],
    [presets, activePresetKey]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Snapshot captured at the moment "+ 새 뷰" is pressed. Shown in the
  // modal preview and used verbatim when the user clicks 저장. Captured
  // up-front (not on submit) so the user sees exactly what they'll save.
  const [snapshot, setSnapshot] = useState<{
    filters: unknown
    sort: unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any
  } | null>(null)

  const openNewPresetModal = async () => {
    if (!activePresetKey || saving) return
    // Prefer the in-memory snapshot from the mounted DataGrid (always
    // current). If the LNB opens on a page that doesn't host a grid,
    // fall back to the last server-saved settings.
    let snap = snapshotLiveView(activePresetKey)
    if (!snap) {
      const saved = await loadSettings(activePresetKey)
      snap = saved
        ? { filters: saved.filters, sort: saved.sort, view: saved.view }
        : { filters: null, sort: null, view: null }
    }
    setSnapshot(snap)
    setModalOpen(true)
  }

  const handleSubmitPreset = async (name: string) => {
    if (!activePresetKey || !snapshot) return
    setSaving(true)
    try {
      const created = await createPreset({
        page_key: activePresetKey,
        name,
        filters: snapshot.filters ?? null,
        sort: snapshot.sort ?? null,
        view: snapshot.view ?? null,
      })
      if (!created) {
        window.alert('뷰 저장에 실패했습니다')
        return
      }
      // Newly created preset becomes the active one for this page — its
      // settings match the current live state exactly.
      setActivePreset(activePresetKey, created.id)
      await refresh()
      setModalOpen(false)
      setSnapshot(null)
    } finally {
      setSaving(false)
    }
  }

  const handleApplyPreset = async (preset: ViewPreset) => {
    // applyPreset does a hard navigate, so no need to call setActivePreset
    // here — it writes the localStorage entry that the next mount will
    // pick up through PresetsProvider's readActiveMap.
    await applyPreset(preset)
  }

  const handleToggleStar = async (preset: ViewPreset) => {
    const next = await updatePreset(preset.id, { starred: !preset.starred })
    if (next) await refresh()
  }

  const handleDelete = async (preset: ViewPreset) => {
    if (!window.confirm(`'${preset.name}' 뷰를 삭제할까요?`)) return
    const ok = await deletePreset(preset.id)
    if (!ok) return
    if (activePresetKey && activePresetId === preset.id) {
      setActivePreset(activePresetKey, null)
    }
    await refresh()
  }

  const widthClass = collapsed ? 'w-[36px]' : 'w-[220px]'
  const transitionClass = animated ? 'transition-[width] duration-200 ease-out' : ''

  if (collapsed) {
    // Collapsed rail: 36px wide, no section content — toggle lives in
    // GNB so there's nothing actionable here. Keeping the rail (rather
    // than removing the element) preserves the horizontal layout and
    // avoids a content-area reflow while the transition animates.
    return (
      <aside
        aria-label="사이드바 (접힘)"
        className={`flex-shrink-0 ${widthClass} ${transitionClass} h-full border-r border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden`}
      />
    )
  }

  return (
    <aside className={`flex-shrink-0 ${widthClass} ${transitionClass} h-full border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-y-auto`}>
      {/* 즐겨찾기 */}
      <SectionLabel>즐겨찾기</SectionLabel>
      <div className="px-2 pb-1">
        {starredPresets.length === 0 && (
          <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
            별표를 눌러 뷰를 고정하세요
          </div>
        )}
        {starredPresets.map(p => (
          <PresetRow
            key={`fav-${p.id}`}
            preset={p}
            active={p.page_key === activePresetKey && activePresetId === p.id}
            onApply={() => handleApplyPreset(p)}
            onToggleStar={() => handleToggleStar(p)}
            onDelete={() => handleDelete(p)}
          />
        ))}
      </div>

      <Divider />

      {/* 현재 페이지 */}
      <SectionLabel>현재 페이지</SectionLabel>
      <div className="px-2 pb-1">
        {!activePresetKey && (
          <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
            뷰를 지원하지 않는 페이지입니다
          </div>
        )}
        {activePresetKey && currentPagePresets.length === 0 && (
          <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
            저장된 뷰가 없습니다
          </div>
        )}
        {currentPagePresets.map(p => (
          <PresetRow
            key={p.id}
            preset={p}
            active={activePresetId === p.id}
            onApply={() => handleApplyPreset(p)}
            onToggleStar={() => handleToggleStar(p)}
            onDelete={() => handleDelete(p)}
          />
        ))}
      </div>
      <div className="px-3 py-1.5">
        <button
          type="button"
          onClick={openNewPresetModal}
          disabled={!activePresetKey || saving}
          title={activePresetKey ? '현재 설정을 새 뷰로 저장' : '뷰를 지원하지 않는 페이지'}
          className="w-full rounded-[6px] border border-dashed border-[#CBD5E1] bg-white px-2 py-1 text-[12px] text-[#64748B] hover:border-[#94A3B8] hover:text-[#334155] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중…' : '+ 새 뷰'}
        </button>
      </div>

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

      <Divider />

      {/* 휴지통 */}
      <nav className="flex flex-col px-2 pb-3">
        <Link
          href={TRASH_PAGE.href ?? '#'}
          className={`rounded-[6px] px-2 py-1.5 text-[13px] transition-colors ${
            activeKey === TRASH_PAGE.key
              ? 'bg-[#2D7FF9] text-white font-medium'
              : 'text-[#334155] hover:bg-[#E2E8F0]'
          }`}
        >
          {TRASH_PAGE.label}
        </Link>
      </nav>

      <NewPresetModal
        open={modalOpen}
        snapshot={snapshot}
        saving={saving}
        onCancel={() => { if (!saving) { setModalOpen(false); setSnapshot(null) } }}
        onSubmit={handleSubmitPreset}
      />
    </aside>
  )
}
