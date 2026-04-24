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
  const bodyObj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {}
  const prefill = sanitizePrefill(bodyObj['prefill'])

  const 제품명Raw = bodyObj['제품명'] ?? prefill['제품명']
  const 제품명Trim = typeof 제품명Raw === 'string' ? 제품명Raw.trim() : ''
  if (제품명Trim.length > 200) {
    return NextResponse.json({ error: '제품명이 너무 깁니다 (max 200)' }, { status: 400 })
  }
  const 제품명 = 제품명Trim || '신규 제품'

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ ...prefill, 제품명 })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[products/create] supabase error:', error?.message)
    return NextResponse.json({ error: '제품 추가에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

// 활성 필터에서 추출한 pre-fill 필드 sanitize. 서버 관리 컬럼은 차단하고
// primitive 값만 통과시킨다. 여기서 허용된 모든 키는 products 테이블에
// 실존한다는 가정 (클라이언트가 col.data = DB 컬럼명 을 그대로 사용).
// 실존하지 않는 컬럼명은 Supabase 쪽에서 에러를 돌려주므로 재차 whitelist
// 하지는 않음.
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
