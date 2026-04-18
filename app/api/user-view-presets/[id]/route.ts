import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

function userKeyFromAuth(email: string | null | undefined): string {
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

// PATCH — partial update of a preset (rename, toggle star, or re-save
// current filter/sort/view). user_key equality guards every write so
// a client cannot touch another user's preset even with a guessed id.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  let body: {
    name?: unknown
    starred?: unknown
    filters?: unknown
    sort?: unknown
    view?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if ('name' in body) {
    if (typeof body.name !== 'string') return NextResponse.json({ error: 'invalid name' }, { status: 400 })
    const trimmed = body.name.trim()
    if (!trimmed) return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })
    if (trimmed.length > 80) return NextResponse.json({ error: '이름은 80자 이내여야 합니다' }, { status: 400 })
    patch.name = trimmed
  }
  if ('starred' in body) {
    if (typeof body.starred !== 'boolean') return NextResponse.json({ error: 'invalid starred' }, { status: 400 })
    patch.starred = body.starred
  }
  if ('filters' in body) patch.filters = body.filters ?? null
  if ('sort' in body) patch.sort = body.sort ?? null
  if ('view' in body) patch.view = body.view ?? null
  patch.updated_at = new Date().toISOString()

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_presets')
    .update(patch)
    .eq('id', id)
    .eq('user_key', user_key)
    .select('id, page_key, name, filters, sort, view, starred, created_at, updated_at')
    .maybeSingle()

  if (error) {
    console.error('[user-view-presets PATCH] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 업데이트에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

// DELETE — remove a preset. Restricted to the owning user via the
// user_key equality filter; hitting someone else's id 404s.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_view_presets')
    .delete()
    .eq('id', id)
    .eq('user_key', user_key)

  if (error) {
    console.error('[user-view-presets DELETE] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
