import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 10

// Editable columns whitelist (order_items direct columns only)
const EDITABLE_COLUMNS = [
  '중량', '데드라인', '작업_위치', '검수', '포장',
  'rp_출력_시작', '왁스_파트_전달', '주물_후_수량', '디자이너_노트', '사출_방식',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { column, value, expected_updated_at } = body

  if (!EDITABLE_COLUMNS.includes(column)) {
    return NextResponse.json({ error: '편집 불가 컬럼' }, { status: 403 })
  }

  // Optimistic locking: check updated_at if provided
  if (expected_updated_at) {
    const { data: current, error: selectError } = await supabaseAdmin
      .from('order_items')
      .select('updated_at')
      .eq('id', params.id)
      .single()

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    if (current?.updated_at !== expected_updated_at) {
      return NextResponse.json(
        { error: 'conflict', message: '다른 사용자가 이미 수정했습니다.' },
        { status: 409 }
      )
    }
  }

  const { error } = await supabaseAdmin
    .from('order_items')
    .update({ [column]: value })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
