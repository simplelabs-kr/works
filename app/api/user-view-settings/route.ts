import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 10

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_key = searchParams.get('user_key')
  const page_key = searchParams.get('page_key')

  if (!user_key || !page_key) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_view_settings')
    .select('filters, sort')
    .eq('user_key', user_key)
    .eq('page_key', page_key)
    .single()

  // PGRST116 = no rows found — treat as empty, not an error
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? null })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_key, page_key, filters, sort } = body

  if (!user_key || !page_key) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_view_settings')
    .upsert(
      { user_key, page_key, filters, sort },
      { onConflict: 'user_key,page_key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
