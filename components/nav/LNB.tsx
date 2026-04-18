'use client'

// Left Nav Bar — per-workspace navigation. Fixed 220px column on the
// left edge of every /works route. Section order:
//   1. 즐겨찾기 — starred (page, view) pairs. Populated by commit 7;
//      skeleton here so the layout is stable.
//   2. 현재 페이지 — shared/my views for the currently-active page plus
//      a "새 뷰" button. Disabled skeleton; wiring lands with commit 7.
//   3. 페이지 목록 — static list from WORKS_PAGES. Coming-soon pages
//      render in a muted style; clicking them is a no-op.
//   4. 휴지통 — separate section, navigates to /works/trash.
//
// Active-page highlight is driven by pathname via resolveActivePage.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  WORKS_PAGES,
  TRASH_PAGE,
  resolveActivePage,
} from '@/lib/nav/pages'

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

export default function LNB() {
  const pathname = usePathname()
  const activePage = resolveActivePage(pathname ?? '')
  const activeKey = activePage?.key ?? null

  return (
    <aside className="flex-shrink-0 w-[220px] h-full border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-y-auto">
      {/* 즐겨찾기 (skeleton) */}
      <SectionLabel>즐겨찾기</SectionLabel>
      <div className="px-3 pb-1 text-[11px] text-[#94A3B8]">
        별표를 눌러 뷰를 고정하세요
      </div>

      <Divider />

      {/* 현재 페이지 (skeleton — views land in commit 7) */}
      <SectionLabel>현재 페이지</SectionLabel>
      <div className="px-3 pb-1 text-[11px] text-[#94A3B8]">공유 뷰</div>
      <div className="px-3 pb-1 text-[11px] text-[#94A3B8]">내 뷰</div>
      <div className="px-3 py-1.5">
        <button
          type="button"
          disabled
          title="구현 예정"
          className="w-full rounded-[6px] border border-dashed border-[#CBD5E1] bg-white px-2 py-1 text-[12px] text-[#94A3B8] cursor-not-allowed"
        >
          + 새 뷰
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
    </aside>
  )
}
