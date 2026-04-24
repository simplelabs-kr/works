import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// products 신규 행 생성. DataGrid + 버튼 / Shift+Enter 에서 bare-row
// INSERT 로 호출된다 (body 가 비어 있거나 afterRowId 만 포함). products
// 테이블의 `제품명` 은 NOT NULL + default 없음이라 DEFAULT VALUES 로는
// 삽입 불가 — 그래서 제품명 미지정 시 placeholder "신규 제품" 을 채워
// NOT NULL 제약을 만족시킨다. 사용자는 바로 인라인 편집으로 실제 이름을
// 입력한다. 제품명 이 body 로 들어오면 그 값을 검증해서 사용.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const 제품명Raw = body && typeof body === 'object' ? (body as Record<string, unknown>)['제품명'] : undefined
  const 제품명Trim = typeof 제품명Raw === 'string' ? 제품명Raw.trim() : ''
  if (제품명Trim.length > 200) {
    return NextResponse.json({ error: '제품명이 너무 깁니다 (max 200)' }, { status: 400 })
  }
  const 제품명 = 제품명Trim || '신규 제품'

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ 제품명 })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[products/create] supabase error:', error?.message)
    return NextResponse.json({ error: '제품 추가에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
