'use client'

// Global Nav Bar — product-level chrome. Logo · WORKS lockup on the left,
// a "빠른 이동 ⌘K" affordance in the middle (delegates to the Command
// Palette owned by WorksShell), and avatar/logout on the right. No page
// tabs here by design: pages live in the LNB.

import { createBrowserClient } from '@supabase/ssr'

type Props = {
  onOpenPalette: () => void
  lnbCollapsed: boolean
  onToggleLnb: () => void
}

export default function GNB({ onOpenPalette, lnbCollapsed, onToggleLnb }: Props) {
  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 h-[44px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleLnb}
          aria-label={lnbCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={lnbCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className="flex items-center justify-center w-[26px] h-[26px] rounded-[4px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <line
              x1={lnbCollapsed ? '4.5' : '5'}
              y1="2.5"
              x2={lnbCollapsed ? '4.5' : '5'}
              y2="11.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-simplelabs.png" alt="SimpleLabs" style={{ height: '18px' }} />
        <span className="h-[14px] w-px bg-[#E2E8F0]" aria-hidden="true" />
        <span className="text-[13px] font-semibold tracking-wide text-[#0F172A]">WORKS</span>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="flex items-center gap-2 h-[28px] rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#334155] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span>빠른 이동</span>
        <kbd className="inline-flex items-center gap-0.5 rounded-[3px] border border-[#E2E8F0] bg-white px-1.5 py-0 h-[16px] text-[10px] font-medium text-[#94A3B8]">⌘K</kbd>
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="text-[12px] text-[#64748B] transition hover:text-[#0F172A]"
      >
        로그아웃
      </button>
    </div>
  )
}
