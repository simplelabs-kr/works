import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const orderItemId = formData.get('order_item_id') as string | null

  if (!file || !orderItemId) {
    return NextResponse.json({ error: 'file and order_item_id required' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeFileName = `${Date.now()}-${encodeURIComponent(file.name)}`
  const filePath = `${orderItemId}/${safeFileName}`

  const { error } = await supabaseAdmin.storage
    .from('reference-files')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('reference-files')
    .getPublicUrl(filePath)

  return NextResponse.json({
    url: urlData.publicUrl,
    name: file.name,
  })
}
