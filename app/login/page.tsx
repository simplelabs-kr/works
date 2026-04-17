'use client'

import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          // force account chooser so users can pick their @simplelabs.kr account
          prompt: 'select_account',
        },
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-simplelabs.png" alt="SimpleLabs" style={{ height: '28px' }} />
          <p className="mt-6 text-sm text-[#475569]">@simplelabs.kr 계정으로 로그인하세요</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC]"
        >
          <GoogleLogo />
          Google로 로그인
        </button>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8436 2.0782-1.7977 2.7164v2.2582h2.9086c1.7018-1.5668 2.6855-3.874 2.6855-6.6151z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2582c-.806.54-1.8368.8582-3.0478.8582-2.344 0-4.3282-1.5832-5.0364-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9636 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.9636 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  )
}
