'use client'

// Client-side chrome container for every /works route. Owns the shared
// Command Palette open/close state so the GNB button and the ⌘K hotkey
// both drive the same instance, and wires the GNB + LNB + content slot
// layout. Rendered from the server-side app/works/layout.tsx.
//
// LNB collapse state:
//   - Persisted in localStorage key 'works_lnb_collapsed' ('true'/'false').
//   - app/works/layout.tsx injects an inline <script> that mirrors the
//     flag onto <html data-lnb-collapsed="true"> before React hydrates,
//     which CSS can use to paint the correct width on first frame.
//   - This component seeds its state lazily from localStorage on mount
//     so the React tree agrees with the attribute after hydration, and
//     writes back on toggle.

import { useCallback, useEffect, useState } from 'react'
import GNB from './GNB'
import LNB from './LNB'
import CommandPalette from './CommandPalette'
import { PresetsProvider } from './PresetsContext'

const LNB_COLLAPSED_LS_KEY = 'works_lnb_collapsed'

function readCollapsedFromStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LNB_COLLAPSED_LS_KEY) === 'true'
  } catch {
    return false
  }
}

export default function WorksShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // State init is ALWAYS false to match the SSR render (which has no
  // localStorage access) — this avoids a React hydration mismatch
  // warning. The "no flash" promise is kept by the inline script in
  // app/works/layout.tsx, which mirrors localStorage onto
  // <html data-lnb-collapsed="true"> before hydration. globals.css
  // uses that attribute to paint the collapsed width on the very
  // first frame. After hydration, the useEffect below reads
  // localStorage and flips React state to match — the CSS override
  // remains consistent with React's output throughout.
  const [lnbCollapsed, setLnbCollapsed] = useState<boolean>(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Post-hydration: sync React state from localStorage and enable
    // width transitions (disabled on first paint so the hydration-
    // time flip from collapsed=false → true doesn't animate).
    setLnbCollapsed(readCollapsedFromStorage())
    setHydrated(true)
  }, [])

  const toggleLnb = useCallback(() => {
    setLnbCollapsed(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(LNB_COLLAPSED_LS_KEY, String(next))
        if (next) document.documentElement.setAttribute('data-lnb-collapsed', 'true')
        else document.documentElement.removeAttribute('data-lnb-collapsed')
      } catch { /* storage disabled — in-memory state still works */ }
      return next
    })
  }, [])

  // Global ⌘K / Ctrl+K listener. Toggles the palette open; closes via Esc
  // are handled inside the palette itself.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return
      if (e.key.toLowerCase() !== 'k') return
      e.preventDefault()
      setPaletteOpen(o => !o)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <PresetsProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        <GNB onOpenPalette={() => setPaletteOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <LNB collapsed={lnbCollapsed} animated={hydrated} onToggle={toggleLnb} />
          <div className="flex-1 min-w-0 min-h-0">
            {children}
          </div>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </PresetsProvider>
  )
}
