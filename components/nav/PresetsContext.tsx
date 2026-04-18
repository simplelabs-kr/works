'use client'

// Shared presets + folders state for LNB + Command Palette. Fetched
// once on mount (and refetched after every CRUD) so both consumers
// see the same lists without each making their own request.
//
// Also tracks the "active" preset per page_key — the one the user most
// recently applied (or created). Persisted in localStorage so a full
// reload after applyPreset keeps the LNB highlight in sync. Cleared
// when the active preset is deleted.
//
// currentUserKey is exposed so client components can gate owner-only
// affordances (star / rename / delete / drag-reorder of collaborative
// rows). The server enforces the same rule; this is purely UX so
// non-owners don't see buttons that would 404.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { listFolders, listPresets, type ViewFolder, type ViewPreset } from '@/lib/works/viewPresets'

type Ctx = {
  presets: ViewPreset[]
  folders: ViewFolder[]
  refresh: () => Promise<void>
  loading: boolean
  // pageKey → preset id currently considered "active" for that page
  activeByPage: Record<string, string>
  setActivePreset: (pageKey: string, presetId: string | null) => void
  currentUserKey: string
}

const PresetsContext = createContext<Ctx | null>(null)

const LS_PREFIX = 'works:active-preset:'
const FALLBACK_USER_KEY = 'dev@simplelabs.kr'

function readActiveMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (!k || !k.startsWith(LS_PREFIX)) continue
      const v = window.localStorage.getItem(k)
      if (typeof v === 'string' && v) out[k.slice(LS_PREFIX.length)] = v
    }
  } catch {
    /* localStorage disabled — fall through with empty map */
  }
  return out
}

// Best-effort: hit /api/me for the signed-in email. If the endpoint
// isn't available (e.g. local dev without auth), fall back to the
// same dev key the server uses so owner checks still line up.
async function fetchCurrentUserKey(): Promise<string> {
  try {
    const res = await fetch('/api/me', { cache: 'no-store' })
    if (!res.ok) return FALLBACK_USER_KEY
    const body = (await res.json()) as { email?: string | null }
    const email = body?.email
    if (typeof email === 'string' && email) return email.toLowerCase()
    return FALLBACK_USER_KEY
  } catch {
    return FALLBACK_USER_KEY
  }
}

export function PresetsProvider({ children }: { children: React.ReactNode }) {
  const [presets, setPresets] = useState<ViewPreset[]>([])
  const [folders, setFolders] = useState<ViewFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeByPage, setActiveByPage] = useState<Record<string, string>>({})
  const [currentUserKey, setCurrentUserKey] = useState<string>(FALLBACK_USER_KEY)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [p, f] = await Promise.all([listPresets(), listFolders()])
    setPresets(p)
    setFolders(f)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    setActiveByPage(readActiveMap())
    void fetchCurrentUserKey().then(setCurrentUserKey)
  }, [refresh])

  // Prune active entries whose preset no longer exists (e.g. deleted in
  // another tab, or the active one was just removed). Keeps the LNB
  // highlight honest without needing callers to manually clear.
  useEffect(() => {
    if (loading) return
    setActiveByPage(prev => {
      const valid = new Set(presets.map(p => p.id))
      let changed = false
      const next: Record<string, string> = {}
      for (const [pageKey, id] of Object.entries(prev)) {
        if (valid.has(id)) next[pageKey] = id
        else {
          changed = true
          try { window.localStorage.removeItem(LS_PREFIX + pageKey) } catch { /* ignore */ }
        }
      }
      return changed ? next : prev
    })
  }, [presets, loading])

  const setActivePreset = useCallback((pageKey: string, presetId: string | null) => {
    setActiveByPage(prev => {
      const next = { ...prev }
      if (presetId) next[pageKey] = presetId
      else delete next[pageKey]
      return next
    })
    try {
      if (presetId) window.localStorage.setItem(LS_PREFIX + pageKey, presetId)
      else window.localStorage.removeItem(LS_PREFIX + pageKey)
    } catch {
      /* storage disabled — in-memory state still works for the session */
    }
  }, [])

  const value = useMemo(
    () => ({ presets, folders, refresh, loading, activeByPage, setActivePreset, currentUserKey }),
    [presets, folders, refresh, loading, activeByPage, setActivePreset, currentUserKey],
  )
  return <PresetsContext.Provider value={value}>{children}</PresetsContext.Provider>
}

export function usePresets(): Ctx {
  const ctx = useContext(PresetsContext)
  if (!ctx) throw new Error('usePresets must be used inside <PresetsProvider>')
  return ctx
}
