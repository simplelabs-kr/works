import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 10

// Editable columns whitelist (order_items direct columns only)
const EDITABLE_FIELDS = new Set([
  '사출_방식',
  '중량',
  '데드라인',
  '작업_위치',
  '검수',
  '포장',
  '출고',
  '왁스_파트_전달',
  'rp_출력_시작',
  '주물_후_수량',
  '죽은_수량',
  '디자이너_노트',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { field, value } = body

  if (!field || !EDITABLE_FIELDS.has(field)) {
    return NextResponse.json({ error: '편집 불가 필드' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('order_items')
    .update({ [field]: value })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
