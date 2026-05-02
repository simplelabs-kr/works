import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'
import {
  createSoftDeleteRoute,
  validateValue,
} from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { PURCHASES_COLUMNS, PURCHASES_EDITABLE_FIELDS } from '@/features/purchases/purchasesConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: PURCHASES_COLUMNS as readonly SpecColumnLike[],
  editableFields: PURCHASES_EDITABLE_FIELDS,
  page: 'purchases',
})

const ID_REGEX = /^[A-Za-z0-9-]{8,64}$/
const LOG_PREFIX = '[purchases]'

// purchases ↔ order_items 다대다 — junction 테이블 (purchase_order_items)
// add/remove 를 PATCH 본문 (`{junctionAdd|junctionRemove: {linkedId}}`) 으로
// 처리. 그 외 본문 (`{field, value}`) 은 표준 컬럼 편집 경로.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  if (!ID_REGEX.test(params.id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  // ── junction add/remove ────────────────────────────────────────────
  const junctionAdd = (body as Record<string, unknown>).junctionAdd
  const junctionRemove = (body as Record<string, unknown>).junctionRemove

  if (junctionAdd || junctionRemove) {
    const op = junctionAdd ? 'add' : 'remove'
    const opPayload = (junctionAdd ?? junctionRemove) as Record<string, unknown>
    const linkedId = opPayload.linkedId
    if (typeof linkedId !== 'string' || !ID_REGEX.test(linkedId)) {
      return NextResponse.json({ error: 'invalid linkedId' }, { status: 400 })
    }

    if (op === 'add') {
      const { error } = await supabaseAdmin
        .from('purchase_order_items')
        .upsert(
          { purchase_id: params.id, order_item_id: linkedId },
          { onConflict: 'purchase_id,order_item_id', ignoreDuplicates: true },
        )
      if (error) {
        console.error(LOG_PREFIX, 'junctionAdd error:', JSON.stringify(error), {
          purchase_id: params.id, order_item_id: linkedId,
        })
        return NextResponse.json({ error: '링크 추가에 실패했습니다' }, { status: 500 })
      }
    } else {
      const { error } = await supabaseAdmin
        .from('purchase_order_items')
        .delete()
        .eq('purchase_id', params.id)
        .eq('order_item_id', linkedId)
      if (error) {
        console.error(LOG_PREFIX, 'junctionRemove error:', JSON.stringify(error), {
          purchase_id: params.id, order_item_id: linkedId,
        })
        return NextResponse.json({ error: '링크 해제에 실패했습니다' }, { status: 500 })
      }
    }
    return NextResponse.json({ success: true })
  }

  // ── 표준 컬럼 편집 ─────────────────────────────────────────────────
  const { field, value } = body as { field?: unknown; value?: unknown }
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
    .from('purchases')
    .update({ [field]: result.normalized })
    .eq('id', params.id)

  if (error) {
    console.error(LOG_PREFIX, 'PATCH error:', JSON.stringify(error), { field, id: params.id })
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export const DELETE = createSoftDeleteRoute({
  table:     'purchases',
  logPrefix: '[purchases]',
})
