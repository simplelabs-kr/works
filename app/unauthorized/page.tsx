'use client'

import { createBrowserClient } from '@supabase/ssr'

export default function UnauthorizedPage() {
  const handleSwitchAccount = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
    // Destroy the current session, then bounce to /login so the user
    // can start a new Google OAuth flow with a different account.
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-base font-semibold text-[#0F172A]">접근이 제한되었습니다</h1>
        <p className="mt-3 text-sm text-[#475569]">@simplelabs.kr 이메일만 접근 가능합니다</p>
        <button
          type="button"
          onClick={handleSwitchAccount}
          className="mt-6 w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
        >
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
