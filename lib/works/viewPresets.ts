// Client helper for user_view_presets. Private MVP: each preset stores
// a name + filters/sort/view blobs scoped to (user, page). Favorites
// (`starred`) surface in the LNB 즐겨찾기 section and the Cmd+K palette.
//
// Per-view isolation model:
//   - When NO preset is active for a page, edits persist to the shared
//     user_view_settings row (keyed by user_key, page_key). That row is
//     the "default view" for the page.
//   - When a preset IS active, edits persist to THAT preset's row in
//     user_view_presets. Each preset therefore keeps its own independent
//     filters/sort/view; switching between them doesn't mutate any
//     other preset, and the default view row is left alone.
//   - Active preset id per page lives in localStorage under
//     `works:active-preset:<page_key>` (mirrored into PresetsContext).
//
// persistViewPatch is the single write entry point that routes to the
// right destination. loadEffectiveSettings is the read counterpart used
// by DataGrid on mount — it reads the active preset's row when present
// and the default row otherwise.

import {
  loadSettings,
  saveSettings,
  type PersistedSettings,
  type PersistedView,
  type SettingsPatch,
} from './viewSettings'
import { readCache, writeCache } from './viewSettingsCache'
import { bumpRemountVersion } from './remountBus'

export const ACTIVE_PRESET_LS_PREFIX = 'works:active-preset:'

function readActivePresetIdFromStorage(pageKey: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ACTIVE_PRESET_LS_PREFIX + pageKey)
  } catch {
    return null
  }
}

function clearActivePresetIdFromStorage(pageKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ACTIVE_PRESET_LS_PREFIX + pageKey)
  } catch { /* ignore */ }
}

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

// Apply a preset to the grid + mark it active for its page. Does NOT
// write into user_view_settings anymore — that was the bug producing
// "whichever preset you applied last becomes the default view, and
// hard refresh always shows it regardless of which preset is active".
//
// Flow:
//   1. flush() any pending debounced save on the mounted grid. That save
//      is aimed at the CURRENT active target (the preset we're about
//      to switch away from, or user_view_settings), so flushing it
//      persists the last in-flight edits to the correct row before we
//      switch. The old code called cancelPending() here, which silently
//      dropped those edits.
//   2. Write the new preset's {filters, sort, view} into the in-session
//      cache. A same-tab mount for this pageKey can now restore from
//      the preset without any network trip.
//   3. Set localStorage active-preset id so the next mount (including
//      hard refresh) knows which row to load FROM. The LNB also mirrors
//      this into PresetsContext so the highlight updates immediately.
//   4. If a grid is mounted for this pageKey, drive it via applyRuntime
//      — same-page applies skip the remount dance. Otherwise bump the
//      remount version so a future mount on this page picks up the
//      cached preset via loadEffectiveSettings.
//
// Navigation is left to the caller so LNB can use Next.js soft nav.
export async function applyPreset(preset: ViewPreset): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewCast = preset.view as any

  // Flush any pending debounced save from the currently-mounted grid.
  // Its write target is the CURRENT active preset (or the default row),
  // not this new one — so flushing it persists the last edits to the
  // correct row before we overwrite localStorage active id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = (() => { try { return (window as any).__worksGrid?.[preset.page_key] } catch { return null } })()
  try { entry?.flush?.() } catch { /* registry shape mismatch */ }

  const nextSettings: PersistedSettings = {
    filters: preset.filters,
    sort: preset.sort,
    view: viewCast,
  }
  writeCache(preset.page_key, nextSettings)

  try {
    window.localStorage.setItem(ACTIVE_PRESET_LS_PREFIX + preset.page_key, preset.id)
  } catch {
    /* storage disabled — LNB will just not highlight until next applyPreset */
  }

  // Primary path: if a DataGrid is already mounted for this pageKey,
  // drive it imperatively so preset.view reliably lands in HOT (widths,
  // hidden columns, freeze, row height) + React state (filters, sort)
  // without depending on a remount cycle.
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

// Route a view-state patch to the correct persistence target:
//   - activePresetId present → PATCH /api/user-view-presets/<id>
//     (only this preset's row mutates, leaving the default row and
//     every other preset untouched).
//   - null → POST /api/user-view-settings (the shared "default view"
//     row for the page).
//
// Always write-through to the in-session cache first so an immediate
// subsequent mount on the same page in this tab restores from the
// post-edit state without waiting for the network round-trip. The
// cache is keyed by pageKey (not preset id) because it represents
// "what the grid should show for this page right now" — whichever
// source the data came from.
export async function persistViewPatch(
  pageKey: string,
  activePresetId: string | null,
  patch: SettingsPatch,
): Promise<void> {
  if (activePresetId) {
    // Merge with cache so a caller passing `{ view }` doesn't clobber
    // the cached filters/sort. DataGrid passes all three every time,
    // but the merge keeps persistViewPatch honest for other callers.
    const prev = readCache(pageKey)
    const next: PersistedSettings = {
      filters: 'filters' in patch ? patch.filters ?? null : prev?.filters ?? null,
      sort: 'sort' in patch ? patch.sort ?? null : prev?.sort ?? null,
      view: 'view' in patch ? patch.view ?? null : prev?.view ?? null,
    }
    writeCache(pageKey, next)
    await updatePreset(activePresetId, {
      filters: next.filters,
      sort: next.sort,
      view: next.view,
    })
    return
  }
  await saveSettings(pageKey, patch)
}

// Load the settings that should actually drive the grid on mount. When
// a preset is active (per localStorage), its row is authoritative; we
// prefer the in-session cache (populated by applyPreset on preset-click
// in this tab) and fall back to listPresets on hard refresh. When no
// preset is active, the default user_view_settings row is loaded as
// before.
//
// If the localStorage active id points to a preset that no longer
// exists (deleted in another tab, etc.), we clear the stale id and
// fall through to the default row — matching PresetsContext's own
// prune-on-load behavior.
export async function loadEffectiveSettings(pageKey: string): Promise<{
  settings: PersistedSettings | null
  activePresetId: string | null
}> {
  const activeId = readActivePresetIdFromStorage(pageKey)

  if (activeId) {
    const cached = readCache(pageKey)
    if (cached) return { settings: cached, activePresetId: activeId }

    const presets = await listPresets(pageKey)
    const p = presets.find(x => x.id === activeId)
    if (p) {
      const settings: PersistedSettings = {
        filters: p.filters,
        sort: p.sort,
        view: p.view as PersistedView | null,
      }
      writeCache(pageKey, settings)
      return { settings, activePresetId: activeId }
    }

    // Stale id — preset was deleted. Drop the LS entry so the next
    // mount doesn't keep trying to load a ghost preset, and fall
    // through to the default row.
    clearActivePresetIdFromStorage(pageKey)
  }

  const settings = await loadSettings(pageKey)
  return { settings, activePresetId: null }
}
