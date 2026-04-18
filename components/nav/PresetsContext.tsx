'use client'

// Shared presets state for LNB + Command Palette. Fetched once on
// mount (and refetched after every CRUD) so both consumers see the
// same list without each making their own request.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { listPresets, type ViewPreset } from '@/lib/works/viewPresets'

type Ctx = {
  presets: ViewPreset[]
  refresh: () => Promise<void>
  loading: boolean
}

const PresetsContext = createContext<Ctx | null>(null)

export function PresetsProvider({ children }: { children: React.ReactNode }) {
  const [presets, setPresets] = useState<ViewPreset[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await listPresets()
    setPresets(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ presets, refresh, loading }), [presets, refresh, loading])
  return <PresetsContext.Provider value={value}>{children}</PresetsContext.Provider>
}

export function usePresets(): Ctx {
  const ctx = useContext(PresetsContext)
  if (!ctx) throw new Error('usePresets must be used inside <PresetsProvider>')
  return ctx
}
