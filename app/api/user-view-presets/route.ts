import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// user_key is derived from the authenticated session so a client cannot
// impersonate another user's presets. Matches the logic in
// /api/user-view-settings so "my settings" and "my presets" live in the
// same namespace.
function userKeyFromAuth(email: string | null | undefined): string {
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

// GET — list presets for the authenticated user. Optional `page_key`
// narrows to a single page; omitting it returns all of the user's
// presets (used by the Command Palette's 즐겨찾기 section, which is
// cross-page).
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { searchParams } = new URL(req.url)
  const page_key = searchParams.get('page_key')

  let q = supabaseAdmin
    .from('user_view_presets')
    .select('id, page_key, name, filters, sort, view, starred, created_at, updated_at')
    .eq('user_key', user_key)
    .order('starred', { ascending: false })
    .order('created_at', { ascending: true })

  if (page_key) q = q.eq('page_key', page_key)

  const { data, error } = await q

  if (error) {
    console.error('[user-view-presets GET] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

// POST — create a preset. Expected body: { page_key, name, filters?,
// sort?, view? }. Filters/sort/view are opaque jsonb blobs; validation
// happens client-side before submission.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)

  let body: {
    page_key?: string
    name?: string
    filters?: unknown
    sort?: unknown
    view?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const page_key = typeof body.page_key === 'string' ? body.page_key : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!page_key) {
    return NextResponse.json({ error: 'missing page_key' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ error: '이름은 80자 이내여야 합니다' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_presets')
    .insert({
      user_key,
      page_key,
      name,
      filters: body.filters ?? null,
      sort: body.sort ?? null,
      view: body.view ?? null,
    })
    .select('id, page_key, name, filters, sort, view, starred, created_at, updated_at')
    .single()

  if (error || !data) {
    console.error('[user-view-presets POST] supabase error:', error?.message)
    return NextResponse.json({ error: '뷰 저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
