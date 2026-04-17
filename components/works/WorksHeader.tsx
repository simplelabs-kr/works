'use client'

import { createBrowserClient } from '@supabase/ssr'

export default function WorksHeader() {
  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 h-[44px]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-simplelabs.png" alt="SimpleLabs" style={{ height: '18px' }} />
        <span className="h-[14px] w-px bg-[#E2E8F0]" aria-hidden="true" />
        <span className="text-[13px] font-semibold tracking-wide text-[#0F172A]">WORKS</span>
      </div>
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
