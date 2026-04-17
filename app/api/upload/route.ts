import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 30

const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB (Vercel payload limit)

// Allowed content types and extensions. Keep list narrow — anything not here is rejected.
const ALLOWED_EXTENSIONS = new Set<string>([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'hwp', 'hwpx',
  // CAD / 3D (장신구 제작용)
  'stl', 'obj', '3dm', 'dwg', 'dxf',
  // Archives
  'zip',
])

const DISALLOWED_MIME_PREFIXES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
]

// SVG, HTML, XML 등은 저장소에 호스팅될 경우 XSS 위험이 있어 차단
const DISALLOWED_EXACT_MIME = new Set<string>([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'text/javascript',
  'application/javascript',
])

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[upload] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const orderItemId = formData.get('order_item_id') as string | null

    if (!file || !orderItemId) {
      return NextResponse.json({ error: 'file and order_item_id required' }, { status: 400 })
    }

    // Basic UUID-ish format check on order_item_id to prevent path traversal / bucket key abuse.
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(orderItemId)) {
      return NextResponse.json({ error: 'invalid order_item_id' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 4.5MB를 초과할 수 없습니다 (Vercel 제한)' },
        { status: 413 },
      )
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const mime = (file.type || '').toLowerCase()

    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json(
        { error: `허용되지 않은 파일 형식입니다 (.${fileExt || '?'})` },
        { status: 415 },
      )
    }
    if (mime) {
      if (DISALLOWED_EXACT_MIME.has(mime)) {
        return NextResponse.json({ error: '허용되지 않은 MIME 타입입니다' }, { status: 415 })
      }
      for (const prefix of DISALLOWED_MIME_PREFIXES) {
        if (mime.startsWith(prefix)) {
          return NextResponse.json({ error: '허용되지 않은 MIME 타입입니다' }, { status: 415 })
        }
      }
    }

    // Server-generated filename. Original name is preserved in the response for display.
    const safeFileName = `${randomUUID()}.${fileExt}`
    const filePath = `${orderItemId}/${safeFileName}`

    const { error } = await supabase.storage
      .from('reference-files')
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[upload] Supabase storage error:', error.message, { filePath, contentType: file.type, size: file.size })
      return NextResponse.json({ error: '파일 업로드에 실패했습니다' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('reference-files')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      name: file.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[upload] Unhandled error:', message)
    return NextResponse.json({ error: '업로드 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
