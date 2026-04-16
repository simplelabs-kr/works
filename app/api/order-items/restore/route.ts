import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // Restore: set deleted_at to null
  const { error } = await supabaseAdmin
    .from('order_items')
    .update({ deleted_at: null })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, restoredCount: ids.length })
}
