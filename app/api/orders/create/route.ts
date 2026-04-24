import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// orders 신규 행 생성. DataGrid + 버튼 / Shift+Enter 에서 bare-row
// INSERT 로 호출된다 (body 가 비어 있거나 prefill 만 포함). prefill 은
// 활성 필터의 equals 계열 조건에서 추출된 값 — 신규 row 가 현재 필터
// 조건을 자동 충족하도록 병합한다.
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const bodyObj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {}
  const prefill = sanitizePrefill(bodyObj['prefill'])

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({ ...prefill })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[orders/create] supabase error:', error?.message)
    return NextResponse.json({ error: '발주 추가에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

// 활성 필터에서 추출한 pre-fill 필드 sanitize. 서버 관리 컬럼은 차단하고
// primitive 값만 통과시킨다. 실존하지 않는 컬럼명은 Supabase 쪽에서
// 에러를 돌려주므로 재차 whitelist 하지는 않음.
const RESERVED_COLUMNS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at',
])
const COLUMN_NAME_RE = /^[A-Za-z0-9_가-힣]+$/
function sanitizePrefill(raw: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (RESERVED_COLUMNS.has(k)) continue
    if (!COLUMN_NAME_RE.test(k)) continue
    if (v === null) { out[k] = null; continue }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    }
  }
  return out
}
