// Client helper for user_view_presets. Private MVP: each preset stores
// a name + filters/sort/view blobs scoped to (user, page). Favorites
// (`starred`) surface in the LNB 즐겨찾기 section and the Cmd+K palette.
//
// applyPreset writes the preset into the in-session viewSettings cache
// + DB, cancels any pending debounced save from the mounted grid, and
// bumps the per-pageKey remount version so <DataGrid/> re-keys and its
// mount-restore effect picks the preset up from cache. Navigation is
// left to the caller (LNB) so cross-page applies can use Next.js soft
// nav instead of tearing down WorksShell/LNB with location.href.

import { saveSettings, type PersistedView } from './viewSettings'
import { writeCache } from './viewSettingsCache'
import { bumpRemountVersion } from './remountBus'

// Live snapshot of the on-screen grid for a given pageKey. Populated by
// DataGrid via `window.__worksGrid[pageKey]` while it is mounted. Returns
// null if the grid for that page is not currently mounted (e.g. LNB on a
// page that does not host a DataGrid).
export function snapshotLiveView(pageKey: string): {
  filters: unknown
  sort: unknown
  view: PersistedView | null
} | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (window as any).__worksGrid?.[pageKey]
  if (!entry || typeof entry.getSnapshot !== 'function') return null
  try {
    entry.flush?.()
    return entry.getSnapshot()
  } catch {
    return null
  }
}

export type ViewPreset = {
  id: string
  page_key: string
  name: string
  filters: unknown | null
  sort: unknown | null
  view: unknown | null
  starred: boolean
  created_at: string
  updated_at: string
}

const ENDPOINT = '/api/user-view-presets'

export async function listPresets(pageKey?: string): Promise<ViewPreset[]> {
  try {
    const url = pageKey
      ? `${ENDPOINT}?page_key=${encodeURIComponent(pageKey)}`
      : ENDPOINT
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const body = (await res.json()) as { data?: ViewPreset[] }
    return body.data ?? []
  } catch {
    return []
  }
}

export async function createPreset(input: {
  page_key: string
  name: string
  filters: unknown | null
  sort: unknown | null
  view: unknown | null
}): Promise<ViewPreset | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { data?: ViewPreset }
    return body.data ?? null
  } catch {
    return null
  }
}

export async function updatePreset(
  id: string,
  patch: { name?: string; starred?: boolean; filters?: unknown; sort?: unknown; view?: unknown }
): Promise<ViewPreset | null> {
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { data?: ViewPreset }
    return body.data ?? null
  } catch {
    return null
  }
}

export async function deletePreset(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}

// Apply a preset: write the preset into the in-session cache + DB,
// cancel any pending debounced save from the mounted grid (so its
// stale-live snapshot can't flush on top of the preset), then bump
// the per-pageKey remount version so the grid wrapper re-keys
// <DataGrid/> and the next mount reads the preset from cache.
//
// Navigation is left to the caller so the LNB can use Next.js soft
// nav (router.push) instead of tearing down WorksShell with
// window.location.href. For same-page applies, the remount bump is
// sufficient on its own — no URL change needed.
//
// Also writes the preset id to localStorage under
// `works:active-preset:<page_key>` so the LNB highlight survives a
// subsequent hard reload.
export async function applyPreset(preset: ViewPreset): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewCast = preset.view as any

  // Cancel any pending debounced save on the mounted grid BEFORE the
  // saveSettings call below. Otherwise a resize that was 400ms mid-
  // debounce could still fire via its own timer and race against the
  // preset write. cancelPending is a no-op if no grid is mounted for
  // this pageKey (e.g. applying a preset for a page the user isn't on).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (() => { try { return (window as any).__worksGrid?.[preset.page_key] } catch { return null } })()
  try { entry?.cancelPending?.() } catch { /* registry shape mismatch */ }

  // Writes through to the in-session cache synchronously, then POSTs
  // to the server (awaited so a tab close right after this resolves
  // with the DB already up to date).
  await saveSettings(preset.page_key, {
    filters: preset.filters,
    sort: preset.sort,
    view: viewCast,
  })

  // Redundant with saveSettings' own cache write, but explicit — if
  // saveSettings' POST failed, the local cache still reflects the
  // preset so the next mount in this session restores correctly.
  const nextSettings = {
    filters: preset.filters,
    sort: preset.sort,
    view: viewCast,
  }
  writeCache(preset.page_key, nextSettings)

  try {
    window.localStorage.setItem(`works:active-preset:${preset.page_key}`, preset.id)
  } catch {
    /* storage disabled — LNB will just not highlight until next applyPreset */
  }

  // Primary path: if a DataGrid is already mounted for this pageKey,
  // drive it imperatively so preset.view reliably lands in HOT (widths,
  // hidden columns, freeze, row height) + React state (filters, sort)
  // without depending on a remount cycle. This replaces the old "bump
  // remount version and hope the key change propagates" path, which
  // could silently no-op when preset-to-preset on the same page.
  if (entry && typeof entry.applyRuntime === 'function') {
    try {
      entry.applyRuntime(nextSettings)
      return
    } catch {
      /* fall through to remount bump below */
    }
  }

  // Fallback for when no grid is currently mounted for this pageKey
  // (e.g. cross-page preset apply from the LNB). The remount-version
  // bump primes any future mount on this page to pick up the cached
  // preset; the actual navigation is the caller's responsibility.
  bumpRemountVersion(preset.page_key)
}
