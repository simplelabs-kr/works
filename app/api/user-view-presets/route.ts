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

// GET — list presets visible to the current user. Two buckets:
//   - scope='collaborative' → returned to everyone (no owner filter).
//     Every teammate sees the same row, and LNB renders it under
//     "공유 뷰".
//   - scope='private' → returned only to the creator (owner_user_key
//     equals the requester). Rendered under "내 뷰".
// Ordering: manual sort_order ASC (nulls last), then created_at ASC
// as tiebreaker. Starred state does NOT affect order — starring is a
// pin, not a move to the top.
//
// owner_user_key is included in the select so the LNB can tell which
// collaborative rows the current user owns (star/delete/write
// affordances gate on ownership client-side; the server enforces the
// same via PATCH/DELETE owner equality).
const PRESET_SELECT =
  'id, page_key, name, filters, sort, view, starred, sort_order, scope, owner_user_key, folder_id, created_at, updated_at'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { searchParams } = new URL(req.url)
  const page_key = searchParams.get('page_key')

  // `.or(...)` expresses: scope='collaborative' OR owner_user_key=me.
  // This returns both team-visible rows and the requester's private
  // rows in a single round-trip.
  let q = supabaseAdmin
    .from('user_view_presets')
    .select(PRESET_SELECT)
    .or(`scope.eq.collaborative,owner_user_key.eq.${user_key}`)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (page_key) q = q.eq('page_key', page_key)

  const { data, error } = await q

  if (error) {
    console.error('[user-view-presets GET] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

// POST — create a preset. Expected body: { page_key, name, scope?,
// folder_id?, filters?, sort?, view? }. Filters/sort/view are opaque
// jsonb blobs; validation happens client-side before submission.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)

  let body: {
    page_key?: string
    name?: string
    scope?: unknown
    folder_id?: unknown
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

  // scope defaults to 'private' for backward compatibility with the
  // original single-scope MVP. A user-provided 'collaborative' opts
  // the preset into the shared list.
  let scope: 'private' | 'collaborative' = 'private'
  if (body.scope === 'collaborative') scope = 'collaborative'
  else if (body.scope && body.scope !== 'private') {
    return NextResponse.json({ error: 'invalid scope' }, { status: 400 })
  }

  // folder_id is optional. The client is expected to only pass a
  // folder_id it's allowed to see; the server trusts it because the
  // DB FK will reject nonexistent ids and a future RLS policy can
  // tighten further.
  let folder_id: string | null = null
  if (body.folder_id !== undefined && body.folder_id !== null) {
    if (typeof body.folder_id !== 'string') {
      return NextResponse.json({ error: 'invalid folder_id' }, { status: 400 })
    }
    folder_id = body.folder_id
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_presets')
    .insert({
      scope,
      owner_user_key: user_key,
      user_key,
      page_key,
      name,
      folder_id,
      filters: body.filters ?? null,
      sort: body.sort ?? null,
      view: body.view ?? null,
    })
    .select(PRESET_SELECT)
    .single()

  if (error || !data) {
    console.error('[user-view-presets POST] supabase error:', error?.message)
    return NextResponse.json({ error: '뷰 저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
