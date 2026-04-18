import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// Hard delete — removes the order_items rows entirely (cascades to
// flat_order_details via existing DB triggers). Only reachable from the
// trash view; callers must confirm before invoking.
//
// Guarded at the API layer: only rows with deleted_at IS NOT NULL are
// deletable, so an accidental call with an active id is a no-op rather
// than data loss.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await req.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('order_items')
    .delete()
    .in('id', ids)
    .not('deleted_at', 'is', null)

  if (error) {
    console.error('[permanent-delete] supabase error:', error.message)
    return NextResponse.json({ error: '영구삭제에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedCount: ids.length })
}
