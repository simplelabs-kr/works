import WorksShell from '@/components/nav/WorksShell'

// Shared chrome (GNB + LNB + Command Palette) for every /works/* route.
// Kept as a server component; the interactive parts live inside
// WorksShell (client). Per-route content renders into the `children`
// slot on the right side of the LNB.
//
// LNB collapse state persistence:
//   - Source of truth: localStorage['works_lnb_collapsed'] ('true'/'false').
//   - Pre-hydration paint: the inline <script> below runs synchronously
//     before React hydrates and mirrors the flag onto
//     <html data-lnb-collapsed="true">. That attribute gives CSS a hook
//     to render the correct width on the very first paint, avoiding
//     the expanded → collapsed flash that a React-state-only approach
//     would produce.
//   - Client-side state: WorksShell seeds its useState lazily from
//     localStorage on mount and writes back on toggle.
//
// Earlier iterations used a cookie so the server could read the value
// and pass it in as initialCollapsed. That path was removed because
// Safari silently drops cookies whose name contains a colon (our old
// key 'works:lnb-collapsed' was invalid per RFC 6265), so refresh
// never actually restored the state on Safari.

const LNB_COLLAPSED_INLINE_SCRIPT = `(function(){try{var c=localStorage.getItem('works_lnb_collapsed')==='true';if(c)document.documentElement.setAttribute('data-lnb-collapsed','true');}catch(e){}})();`

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: LNB_COLLAPSED_INLINE_SCRIPT }}
      />
      <WorksShell>{children}</WorksShell>
    </>
  )
}
