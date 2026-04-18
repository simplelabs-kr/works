import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// Lightweight endpoint for the client to discover the signed-in user's
// email (and thus the user_key used server-side). Exposed purely so the
// LNB can gate owner-only affordances on collaborative rows — the
// authoritative permission check still happens on every PATCH/DELETE
// via owner_user_key equality.
export async function GET() {
  const auth = await requireUser()
  if (auth.response) return auth.response
  return NextResponse.json({ email: auth.user.email ?? null })
}
