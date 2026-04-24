import { NextRequest, NextResponse } from 'next/server'
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
//
// sort_order 배정:
//  - afterRowId 미지정 → MAX(sort_order) + 1000 (없으면 1000)
//  - afterRowId 지정 → afterRow 의 sort_order (A) 와 그 다음 row 의
//    sort_order (B) 사이의 중간값. B 가 없으면 A + 1000.
//  - afterRow.sort_order 가 NULL 이면 (legacy 백필 포기 레코드) 맨 뒤에
//    추가 — MAX + 1000 로 처리.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const afterRowIdRaw =
    body && typeof body === 'object' ? (body as Record<string, unknown>)['afterRowId'] : undefined
  const afterRowId = typeof afterRowIdRaw === 'string' && afterRowIdRaw.trim() ? afterRowIdRaw : null

  const sortOrder = await computeSortOrder(afterRowId)
  if (sortOrder == null) {
    return NextResponse.json({ error: 'sort_order 계산에 실패했습니다' }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .insert({ sort_order: sortOrder })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[order-items/create] supabase error:', error?.message)
    return NextResponse.json({ error: '행 추가에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, sort_order: sortOrder })
}

async function computeSortOrder(afterRowId: string | null): Promise<number | null> {
  // 꼬리에 추가.
  if (!afterRowId) {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .select('sort_order')
      .not('sort_order', 'is', null)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('[order-items/create] MAX(sort_order) 조회 실패:', error.message)
      return null
    }
    const max = (data?.sort_order as number | null) ?? 0
    return max + 1000
  }

  // afterRow 의 sort_order 조회.
  const { data: after, error: afterErr } = await supabaseAdmin
    .from('order_items')
    .select('sort_order')
    .eq('id', afterRowId)
    .maybeSingle()
  if (afterErr) {
    console.error('[order-items/create] afterRow 조회 실패:', afterErr.message)
    return null
  }
  const A = after?.sort_order as number | null | undefined
  // afterRow 가 legacy (sort_order NULL) 면 맨 뒤로 배치.
  if (A == null) return computeSortOrder(null)

  // 다음 row 조회 (sort_order > A 중 최소).
  const { data: next, error: nextErr } = await supabaseAdmin
    .from('order_items')
    .select('sort_order')
    .gt('sort_order', A)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (nextErr) {
    console.error('[order-items/create] nextRow 조회 실패:', nextErr.message)
    return null
  }
  const B = next?.sort_order as number | null | undefined
  if (B == null) return A + 1000
  // 중간값. 정수 테이블이어도 bigint / numeric 으로 충분히 큰 간격 유지.
  return Math.floor((A + B) / 2)
}
