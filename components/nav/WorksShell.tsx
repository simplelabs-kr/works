'use client'

// Client-side chrome container for every /works route. Owns the shared
// Command Palette open/close state so the GNB button and the ⌘K hotkey
// both drive the same instance, and wires the GNB + LNB + content slot
// layout. Rendered from the server-side app/works/layout.tsx.

import { useEffect, useState } from 'react'
import GNB from './GNB'
import LNB from './LNB'
import CommandPalette from './CommandPalette'
import { PresetsProvider } from './PresetsContext'

export default function WorksShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

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
          <LNB />
          <div className="flex-1 min-w-0 min-h-0">
            {children}
          </div>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </PresetsProvider>
  )
}
