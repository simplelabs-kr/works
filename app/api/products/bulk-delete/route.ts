import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await req.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // soft delete 우선 — products에 deleted_at 컬럼이 있으면 update, 없으면 DELETE.
  const softRes = await supabaseAdmin
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (!softRes.error) {
    return NextResponse.json({ success: true, deletedCount: ids.length })
  }

  const hardRes = await supabaseAdmin.from('products').delete().in('id', ids)
  if (hardRes.error) {
    console.error('[products/bulk-delete] supabase error:', hardRes.error.message)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true, deletedCount: ids.length })
}
