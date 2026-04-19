import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

type FieldType = 'number' | 'boolean' | 'date' | 'text'

type FieldSpec = {
  type: FieldType
  maxLength?: number
}

// products 테이블 편집 가능 필드 명세.
// 제외: lookup/JOIN 유래 파생 컬럼(브랜드명, parent_여부, 가다번호_목록,
// 가다위치_목록, mold_개수, sample_개수, claim_개수)은 RPC 응답에만 존재
// — PATCH 대상 아님. 또한 수식/formula성 컬럼도 제외.
// select 필드(카테고리, 개발_현황, 마감_잠금, 체류지)는 런타임 옵션 카탈로그가
// field_options 테이블에서 로드되므로 enum 고정 대신 text로 허용폭을 둔다.
const FIELD_SPECS: Record<string, FieldSpec> = {
  '제품명': { type: 'text', maxLength: 200 },
  '제품코드': { type: 'text', maxLength: 100 },
  '카테고리': { type: 'text', maxLength: 50 },
  '발주_가능': { type: 'boolean' },
  '제공_중단': { type: 'boolean' },
  '개발_현황': { type: 'text', maxLength: 50 },
  '기본_공임': { type: 'number' },
  '추가금_도금': { type: 'number' },
  '추가금_sil': { type: 'number' },
  '추가금_wg': { type: 'number' },
  '추가금_yg': { type: 'number' },
  '추가금_rg': { type: 'number' },
  '제작_소요일': { type: 'number' },
  '기준_중량': { type: 'number' },
  '체인_두께': { type: 'number' },
  '마감_잠금': { type: 'text', maxLength: 50 },
  '검수_유의': { type: 'text', maxLength: 2000 },
  '작업지시서': { type: 'text', maxLength: 2000 },
  '체류지': { type: 'text', maxLength: 50 },
  '파일_경로': { type: 'text', maxLength: 500 },
  '개발_슬랙_링크': { type: 'text', maxLength: 500 },
  '개발_슬랙_id': { type: 'text', maxLength: 100 },
  '슬랙_thread_id': { type: 'text', maxLength: 100 },
  '원가_스톤세팅비': { type: 'number' },
  '원가_원자재비': { type: 'number' },
  '원가_주물비': { type: 'number' },
  '원가_고정각인비': { type: 'number' },
  '원가_폴리싱비': { type: 'number' },
  '원가_기타': { type: 'number' },
  '원가_체인비': { type: 'number' },
  '원가_심플랩스': { type: 'number' },
  'brand_id': { type: 'text', maxLength: 64 },
}

function validateValue(spec: FieldSpec, value: unknown): { ok: true; normalized: unknown } | { ok: false; reason: string } {
  switch (spec.type) {
    case 'number': {
      if (value === null || value === undefined || value === '') return { ok: true, normalized: null }
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return { ok: false, reason: 'invalid number' }
      return { ok: true, normalized: n }
    }
    case 'boolean': {
      if (typeof value === 'boolean') return { ok: true, normalized: value }
      if (value === null || value === undefined) return { ok: true, normalized: false }
      return { ok: false, reason: 'invalid boolean' }
    }
    case 'date': {
      if (value === null || value === undefined || value === '') return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid date' }
      const trimmed = value.trim()
      if (trimmed === '') return { ok: true, normalized: null }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { ok: false, reason: 'invalid date format (YYYY-MM-DD)' }
      return { ok: true, normalized: trimmed }
    }
    case 'text': {
      if (value === null || value === undefined) return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid text' }
      if (spec.maxLength != null && value.length > spec.maxLength) {
        return { ok: false, reason: `text too long (max ${spec.maxLength})` }
      }
      return { ok: true, normalized: value === '' ? null : value }
    }
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  if (!/^[A-Za-z0-9-]{8,64}$/.test(params.id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const body = await req.json()
  const { field, value } = body

  if (typeof field !== 'string') {
    return NextResponse.json({ error: '편집 불가 필드' }, { status: 403 })
  }

  const spec = FIELD_SPECS[field]
  if (!spec) {
    return NextResponse.json({ error: '편집 불가 필드' }, { status: 403 })
  }

  const result = validateValue(spec, value)
  if (!result.ok) {
    return NextResponse.json({ error: `잘못된 값: ${result.reason}` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update({ [field]: result.normalized })
    .eq('id', params.id)

  if (error) {
    console.error('[products PATCH] supabase error:', error.message, { field, id: params.id })
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// soft delete: products에 deleted_at 컬럼이 있으면 soft, 없으면 바로 DELETE.
// 운영 시점에 어느 쪽인지 확정되면 이 분기는 제거.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  if (!/^[A-Za-z0-9-]{8,64}$/.test(params.id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  // soft delete 시도
  const softRes = await supabaseAdmin
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (!softRes.error) {
    return NextResponse.json({ success: true })
  }

  // deleted_at 컬럼이 없다면 바로 hard delete
  const hardRes = await supabaseAdmin.from('products').delete().eq('id', params.id)
  if (hardRes.error) {
    console.error('[products DELETE] supabase error:', hardRes.error.message, { id: params.id })
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
