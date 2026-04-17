import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // Soft delete: set deleted_at to current timestamp
  const { error } = await supabaseAdmin
    .from('order_items')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) {
    console.error('[bulk-delete] supabase error:', error.message)
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedCount: ids.length })
}
