import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// OAuth PKCE callback — exchange the ?code for a session cookie,
// then send the user to /works (or /unauthorized if the domain check fails).
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login`)
    }
  }

  return NextResponse.redirect(`${origin}/works`)
}
