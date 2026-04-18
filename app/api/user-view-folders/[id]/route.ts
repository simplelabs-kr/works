import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

const FOLDER_SELECT =
  'id, page_key, name, scope, owner_user_key, sort_order, created_at, updated_at'

function userKeyFromAuth(email: string | null | undefined): string {
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

// PATCH — rename / reorder / change scope. Owner-only via
// owner_user_key equality on the update.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { id } = params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  let body: {
    name?: unknown
    sort_order?: unknown
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
  if ('sort_order' in body) {
    if (body.sort_order === null) patch.sort_order = null
    else if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
      patch.sort_order = body.sort_order
    } else {
      return NextResponse.json({ error: 'invalid sort_order' }, { status: 400 })
    }
  }
  if ('scope' in body) {
    if (body.scope === 'private' || body.scope === 'collaborative') patch.scope = body.scope
    else return NextResponse.json({ error: 'invalid scope' }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_folders')
    .update(patch)
    .eq('id', id)
    .eq('owner_user_key', user_key)
    .select(FOLDER_SELECT)
    .maybeSingle()

  if (error) {
    console.error('[user-view-folders PATCH] supabase error:', error.message)
    return NextResponse.json({ error: '폴더 업데이트에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found or not owner' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

// DELETE — remove a folder. Before deletion, orphan any presets
// pointing at it by clearing their folder_id, so those views fall
// back to the section's top level rather than disappearing. This is
// done in a separate statement (no ON DELETE CASCADE on folder_id)
// because the user spec specifically calls for "presets move out of
// the folder" rather than being deleted with it.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { id } = params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  // 1. Detach presets. We don't require owner equality on the presets
  //    — a collaborative folder may contain other users' views (once
  //    that flow exists), and detaching is safe because it only nulls
  //    folder_id. If the folder is private, only the owner's own
  //    presets reference it anyway.
  const { error: detachErr } = await supabaseAdmin
    .from('user_view_presets')
    .update({ folder_id: null, updated_at: new Date().toISOString() })
    .eq('folder_id', id)
  if (detachErr) {
    console.error('[user-view-folders DELETE] detach error:', detachErr.message)
    return NextResponse.json({ error: '폴더 삭제에 실패했습니다' }, { status: 500 })
  }

  // 2. Delete the folder row (owner-only).
  const { error } = await supabaseAdmin
    .from('user_view_folders')
    .delete()
    .eq('id', id)
    .eq('owner_user_key', user_key)
  if (error) {
    console.error('[user-view-folders DELETE] supabase error:', error.message)
    return NextResponse.json({ error: '폴더 삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
