import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    // Env check
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

    const bytes = await file.arrayBuffer()
    const safeFileName = `${Date.now()}-${encodeURIComponent(file.name)}`
    const filePath = `${orderItemId}/${safeFileName}`

    // Resolve MIME — browser may send empty string for some file types
    const contentType = file.type || getMimeType(file.name) || 'application/octet-stream'

    const { error } = await supabaseAdmin.storage
      .from('reference-files')
      .upload(filePath, new Uint8Array(bytes), {
        contentType,
        upsert: true,
      })

    if (error) {
      console.error('[upload] Supabase storage error:', error.message, { filePath, contentType, size: bytes.byteLength })
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

/** Fallback MIME lookup for common file types when browser sends empty type */
function getMimeType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  }
  return ext ? map[ext] ?? null : null
}
