'use client'

// Client-side chrome container for every /works route. Owns the shared
// Command Palette open/close state so the GNB button and the ⌘K hotkey
// both drive the same instance, and wires the GNB + LNB + content slot
// layout. Rendered from the server-side app/works/layout.tsx.
//
// Also owns the LNB collapsed state. Persisted in a cookie (read by
// app/works/layout.tsx on the server and passed in as initialCollapsed)
// so the first paint reflects the user's preferred width — no expanded
// → collapsed flash on refresh, which is what the old localStorage-
// only path produced because localStorage isn't readable on the
// server render.

import { useCallback, useEffect, useState } from 'react'
import GNB from './GNB'
import LNB from './LNB'
import CommandPalette from './CommandPalette'
import { PresetsProvider } from './PresetsContext'

export const LNB_COLLAPSED_COOKIE = 'works:lnb-collapsed'

type Props = {
  children: React.ReactNode
  // Read from cookie on the server so the first client paint matches
  // the server HTML. Undefined on first-ever visit (no cookie yet) →
  // expanded.
  initialCollapsed?: boolean
}

export default function WorksShell({ children, initialCollapsed = false }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Seed from the cookie-read prop so the server render and the first
  // client commit agree — avoids the hydration-time width flash.
  const [lnbCollapsed, setLnbCollapsed] = useState(initialCollapsed)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Flip the animated flag on after hydration so width transitions
    // don't play on the first paint. (The initial width is already
    // correct via initialCollapsed, so we don't need to re-read the
    // cookie here.)
    setHydrated(true)
  }, [])

  const toggleLnb = useCallback(() => {
    setLnbCollapsed(prev => {
      const next = !prev
      try {
        // 1-year persistent cookie, path=/ so every /works route reads
        // the same value. SameSite=Lax is the safe default for nav-
        // driven state. No HttpOnly — this needs to be client-writable.
        document.cookie = `${LNB_COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
      } catch { /* ignore — e.g. cookies disabled */ }
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
          {/* Suppress the first-paint flash of the wrong width: until
              localStorage has been read we leave lnbCollapsed=false which
              matches the server render. `hydrated` just gates whether
              transitions kick in — they'd be distracting on first paint. */}
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
