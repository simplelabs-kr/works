import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// Bare-row insert. order_items has `id` as the only NOT NULL column (uuid
// default + other defaults), so `INSERT ... DEFAULT VALUES RETURNING id`
// is enough. flat_order_details is populated by triggers joining on
// order_id / product_id, so a bare row will NOT appear in the grid's
// fetch endpoint until those fields are edited. The client handles that
// via an optimistic placeholder row keyed by the returned id; subsequent
// fetches dedupe by id once the denormalized row materializes.
export async function POST() {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .insert({})
    .select('id')
    .single()

  if (error || !data) {
    console.error('[order-items/create] supabase error:', error?.message)
    return NextResponse.json({ error: '행 추가에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
