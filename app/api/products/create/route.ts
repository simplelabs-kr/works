import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// products 신규 행 생성. 스펙상 필수 입력은 제품명 하나이므로 제품명만
// 서버에서 엄격 검증한다. 그 외 모든 컬럼은 클라이언트가 비워둔 채
// 나중에 인라인 편집으로 채운다.
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
  const 제품명 = typeof 제품명Raw === 'string' ? 제품명Raw.trim() : ''
  if (!제품명) {
    return NextResponse.json({ error: '제품명은 필수입니다' }, { status: 400 })
  }
  if (제품명.length > 200) {
    return NextResponse.json({ error: '제품명이 너무 깁니다 (max 200)' }, { status: 400 })
  }

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
