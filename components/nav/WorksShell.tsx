'use client'

// Client-side chrome container for every /works route. Owns the shared
// Command Palette open/close state so the GNB button and the ⌘K hotkey
// both drive the same instance, and wires the GNB + LNB + content slot
// layout. Rendered from the server-side app/works/layout.tsx.
//
// Also owns the LNB collapsed state. Persisted in localStorage so a
// full reload (triggered by applyPreset's window.location.href swap)
// doesn't reset the user's preferred sidebar width.

import { useCallback, useEffect, useState } from 'react'
import GNB from './GNB'
import LNB from './LNB'
import CommandPalette from './CommandPalette'
import { PresetsProvider } from './PresetsContext'

const LS_LNB_COLLAPSED = 'works:lnb-collapsed'

export default function WorksShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Start collapsed=false; the mount effect below reconciles with
  // localStorage in a second commit. This matches the server render
  // (which has no access to localStorage) and avoids the hydration
  // mismatch a conditional initialState would produce.
  const [lnbCollapsed, setLnbCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setLnbCollapsed(window.localStorage.getItem(LS_LNB_COLLAPSED) === '1')
    } catch {
      /* storage disabled — stay expanded */
    }
    setHydrated(true)
  }, [])

  const toggleLnb = useCallback(() => {
    setLnbCollapsed(prev => {
      const next = !prev
      try { window.localStorage.setItem(LS_LNB_COLLAPSED, next ? '1' : '0') } catch { /* ignore */ }
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
        <GNB
          onOpenPalette={() => setPaletteOpen(true)}
          lnbCollapsed={lnbCollapsed}
          onToggleLnb={toggleLnb}
        />
        <div className="flex flex-1 min-h-0">
          {/* Suppress the first-paint flash of the wrong width: until
              localStorage has been read we leave lnbCollapsed=false which
              matches the server render. `hydrated` just gates whether
              transitions kick in — they'd be distracting on first paint. */}
          <LNB collapsed={lnbCollapsed} animated={hydrated} />
          <div className="flex-1 min-w-0 min-h-0">
            {children}
          </div>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </PresetsProvider>
  )
}
