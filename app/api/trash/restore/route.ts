import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// 통합 휴지통 복구. source 에 따라 원본 테이블을 결정하고 deleted_at 을
// 클리어한다. 각 테이블의 기존 restore 라우트와 달리 단건 ID + source
// 페어만 허용 — 통합 리스트는 행 하나당 복구 버튼을 노출하는 단순 UX.
const TABLE_BY_SOURCE: Record<string, string> = {
  'order-items': 'order_items',
  'products': 'products',
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await req.json().catch(() => null)
  const source = typeof body?.source === 'string' ? body.source : ''
  const id = typeof body?.id === 'string' ? body.id : ''

  const table = TABLE_BY_SOURCE[source]
  if (!table) {
    return NextResponse.json({ error: 'unknown source' }, { status: 400 })
  }
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from(table)
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) {
    console.error('[trash/restore] supabase error:', error.message, { source, id })
    return NextResponse.json({ error: '복구에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
