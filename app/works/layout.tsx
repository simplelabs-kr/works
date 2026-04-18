import { cookies } from 'next/headers'
import WorksShell, { LNB_COLLAPSED_COOKIE } from '@/components/nav/WorksShell'

// Shared chrome (GNB + LNB + Command Palette) for every /works/* route.
// Kept as a server component; the interactive parts live inside
// WorksShell (client). Per-route content renders into the `children`
// slot on the right side of the LNB.
//
// Reads the LNB collapse state from a cookie on the server so the
// initial HTML already has the correct sidebar width. Without this,
// WorksShell renders expanded on the server, hydrates, then reads
// localStorage and flips to collapsed — producing a visible flash
// on every refresh for users who prefer the collapsed rail.

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialCollapsed = cookies().get(LNB_COLLAPSED_COOKIE)?.value === '1'
  return <WorksShell initialCollapsed={initialCollapsed}>{children}</WorksShell>
}
