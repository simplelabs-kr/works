import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 30

const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB (Vercel payload limit)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[upload] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const orderItemId = formData.get('order_item_id') as string | null

    if (!file || !orderItemId) {
      return NextResponse.json({ error: 'file and order_item_id required' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 4.5MB를 초과할 수 없습니다 (Vercel 제한)' },
        { status: 413 },
      )
    }

    const safeFileName = `${Date.now()}-${encodeURIComponent(file.name)}`
    const filePath = `${orderItemId}/${safeFileName}`

    const { error } = await supabaseAdmin.storage
      .from('reference-files')
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      console.error('[upload] Supabase storage error:', error.message, { filePath, contentType: file.type, size: file.size })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('reference-files')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      name: file.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[upload] Unhandled error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
