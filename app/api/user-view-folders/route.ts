import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// user_view_folders CRUD. Mirrors the preset visibility rules:
//   - scope='collaborative' folders are visible to everyone; only the
//     owner can rename/reorder/delete.
//   - scope='private' folders are visible only to their owner.
//
// Shape:
//   (id, page_key, name, scope, owner_user_key, sort_order,
//    created_at, updated_at)

function userKeyFromAuth(email: string | null | undefined): string {
  return (email ?? 'dev@simplelabs.kr').toLowerCase()
}

const FOLDER_SELECT =
  'id, page_key, name, scope, owner_user_key, sort_order, created_at, updated_at'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)
  const { searchParams } = new URL(req.url)
  const page_key = searchParams.get('page_key')

  let q = supabaseAdmin
    .from('user_view_folders')
    .select(FOLDER_SELECT)
    .or(`scope.eq.collaborative,owner_user_key.eq.${user_key}`)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (page_key) q = q.eq('page_key', page_key)

  const { data, error } = await q
  if (error) {
    console.error('[user-view-folders GET] supabase error:', error.message)
    return NextResponse.json({ error: '폴더 조회에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const user_key = userKeyFromAuth(auth.user.email)

  let body: {
    page_key?: string
    name?: string
    scope?: unknown
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

  let scope: 'private' | 'collaborative' = 'private'
  if (body.scope === 'collaborative') scope = 'collaborative'
  else if (body.scope && body.scope !== 'private') {
    return NextResponse.json({ error: 'invalid scope' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_folders')
    .insert({
      page_key,
      name,
      scope,
      owner_user_key: user_key,
    })
    .select(FOLDER_SELECT)
    .single()

  if (error || !data) {
    console.error('[user-view-folders POST] supabase error:', error?.message)
    return NextResponse.json({ error: '폴더 저장에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ data })
}
