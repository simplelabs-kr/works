import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

const PRESET_SELECT =
  'id, page_key, name, filters, sort, view, starred, sort_order, scope, owner_user_key, folder_id, created_at, updated_at'

function userKeyFromAuth(email: string | null | undefined): string {
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

// PATCH — partial update of a preset (rename, toggle star, re-save
// current filter/sort/view, move between folders, or reorder). The
// owner_user_key equality on the update guards every write — even
// collaborative rows can only be modified by their owner, so a
// teammate's edits to a shared view never hit the DB. Clients that
// want to fork someone else's view should POST a new private row
// instead of PATCHing (see "내 뷰로 복사" in the LNB).
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
    sort_order?: unknown
    folder_id?: unknown
    scope?: unknown
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
  if ('sort_order' in body) {
    if (body.sort_order === null) {
      patch.sort_order = null
    } else if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
      patch.sort_order = body.sort_order
    } else {
      return NextResponse.json({ error: 'invalid sort_order' }, { status: 400 })
    }
  }
  if ('folder_id' in body) {
    if (body.folder_id === null) {
      patch.folder_id = null
    } else if (typeof body.folder_id === 'string') {
      patch.folder_id = body.folder_id
    } else {
      return NextResponse.json({ error: 'invalid folder_id' }, { status: 400 })
    }
  }
  if ('scope' in body) {
    if (body.scope === 'private' || body.scope === 'collaborative') {
      patch.scope = body.scope
    } else {
      return NextResponse.json({ error: 'invalid scope' }, { status: 400 })
    }
  }
  patch.updated_at = new Date().toISOString()

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_presets')
    .update(patch)
    .eq('id', id)
    .eq('owner_user_key', user_key)
    .select(PRESET_SELECT)
    .maybeSingle()

  if (error) {
    console.error('[user-view-presets PATCH] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 업데이트에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    // Either the id doesn't exist or the requester isn't its owner.
    // We conflate the two so a non-owner probing for collaborative
    // view ids can't tell the difference between "you can't touch it"
    // and "not found".
    return NextResponse.json({ error: 'not found or not owner' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

// DELETE — remove a preset. Owner-only regardless of scope (deleting
// a shared view should be restricted to its creator).
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
    .eq('owner_user_key', user_key)

  if (error) {
    console.error('[user-view-presets DELETE] supabase error:', error.message)
    return NextResponse.json({ error: '뷰 삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
