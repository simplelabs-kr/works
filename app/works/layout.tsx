import WorksShell from '@/components/nav/WorksShell'

// Shared chrome (GNB + LNB + Command Palette) for every /works/* route.
// Kept as a server component; the interactive parts live inside
// WorksShell (client). Per-route content renders into the `children`
// slot on the right side of the LNB.

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorksShell>{children}</WorksShell>
}
