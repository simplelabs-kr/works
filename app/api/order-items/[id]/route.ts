import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

type FieldType = 'number' | 'boolean' | 'date' | 'text' | 'enum' | 'attachment_list'

type FieldSpec = {
  type: FieldType
  // text 길이 제한
  maxLength?: number
  // enum 허용값
  values?: string[]
}

// 필드별 타입/제약 명세. EDITABLE_FIELDS의 변경은 반드시 이 맵과 동기화.
const FIELD_SPECS: Record<string, FieldSpec> = {
  '사출_방식': { type: 'enum', values: ['RP', '왁스', ''] },
  '중량': { type: 'number' },
  '데드라인': { type: 'date' },
  '작업_위치': { type: 'enum', values: [
    '현장', '검수', '조립', '마무리 광', '조각', '도금', '각인', '광실',
    '세척/검수후재작업', '에폭시(연마)', '에폭시(일반)', '컷팅', '외부',
    '대기', '취소', '조립 대기 중', '유화', '초벌', '',
  ] },
  '검수': { type: 'boolean' },
  '포장': { type: 'boolean' },
  '출고': { type: 'boolean' },
  '왁스_파트_전달': { type: 'boolean' },
  'rp_출력_시작': { type: 'boolean' },
  '주물_후_수량': { type: 'number' },
  '죽은_수량': { type: 'number' },
  '디자이너_노트': { type: 'text', maxLength: 2000 },
  'reference_files': { type: 'attachment_list' },
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
      return { ok: true, normalized: value }
    }
    case 'enum': {
      if (value === null || value === undefined) return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid enum' }
      if (!spec.values?.includes(value)) return { ok: false, reason: 'value not in enum' }
      return { ok: true, normalized: value === '' ? null : value }
    }
    case 'attachment_list': {
      if (value === null || value === undefined) return { ok: true, normalized: [] }
      if (!Array.isArray(value)) return { ok: false, reason: 'attachment list must be array' }
      if (value.length > 50) return { ok: false, reason: 'too many attachments (max 50)' }
      for (const item of value) {
        if (!item || typeof item !== 'object') return { ok: false, reason: 'invalid attachment item' }
        const a = item as Record<string, unknown>
        if (typeof a.url !== 'string' || typeof a.name !== 'string') {
          return { ok: false, reason: 'attachment must have string url and name' }
        }
        if (a.url.length > 2048 || a.name.length > 512) {
          return { ok: false, reason: 'attachment url/name too long' }
        }
      }
      return { ok: true, normalized: value }
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
    .from('order_items')
    .update({ [field]: result.normalized })
    .eq('id', params.id)

  if (error) {
    console.error('[order-items PATCH] supabase error:', error.message, { field, id: params.id })
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
