import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// user_key is derived from the authenticated session — never trust a
// client-provided value, otherwise any signed-in user could read/write
// another user's view settings.
function userKeyFromAuth(email: string | null | undefined): string {
  // Matches requireUser's dev bypass identity so local dev is consistent.
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { searchParams } = new URL(req.url)
  const page_key = searchParams.get('page_key')

  if (!page_key) {
    return NextResponse.json({ error: 'missing page_key' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_settings')
    .select('filters, sort, view')
    .eq('user_key', user_key)
    .eq('page_key', page_key)
    .maybeSingle()

  if (error) {
    console.error('[user-view-settings GET] supabase error:', error.message)
    return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? null })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)

  let body: {
    page_key?: string
    filters?: unknown
    sort?: unknown
    view?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { page_key } = body
  if (!page_key) {
    return NextResponse.json({ error: 'missing page_key' }, { status: 400 })
  }

  // Merge semantics: only overwrite the columns the caller explicitly supplied,
  // so saving `view` alone doesn't wipe filters/sort (and vice versa). Requires
  // one extra read, but the debounced save cadence makes this negligible.
  const { data: existing, error: readErr } = await supabaseAdmin
    .from('user_view_settings')
    .select('filters, sort, view')
    .eq('user_key', user_key)
    .eq('page_key', page_key)
    .maybeSingle()

  if (readErr) {
    console.error('[user-view-settings POST read] supabase error:', readErr.message)
    return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 })
  }

  const merged = {
    user_key,
    page_key,
    filters: 'filters' in body ? body.filters ?? null : existing?.filters ?? null,
    sort: 'sort' in body ? body.sort ?? null : existing?.sort ?? null,
    view: 'view' in body ? body.view ?? null : existing?.view ?? null,
    // Always bump updated_at client-side — the table may not have a trigger
    // to update it automatically, and without a change the upsert is a no-op
    // when the jsonb blob happens to match the existing row.
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('user_view_settings')
    .upsert(merged, { onConflict: 'user_key,page_key' })

  if (error) {
    console.error('[user-view-settings POST] supabase error:', error.message)
    return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
