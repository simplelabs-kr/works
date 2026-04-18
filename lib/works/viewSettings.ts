// Personal view settings (per-user, per-page) for the Works grid.
//
// Persisted shape in `user_view_settings` (three jsonb columns):
// - filters: the FilterModal `RootFilterState` (or null for "no filter")
// - sort:    SortModal's SortCondition[] (or null for "no sort")
// - view:    PersistedView (column order/widths/hidden/frozen + row height)
//
// This module is intentionally typed loosely for `filters`/`sort` so it
// doesn't pull in UI-component types; the grid narrows them on read.
//
// In-session cache: loadSettings/saveSettings delegate to viewSettingsCache
// to keep the "just-wrote this" value available for the next mount in the
// same tab, without waiting for the POST round-trip. See that module for
// the race condition it guards against.

import { readCache, writeCache } from './viewSettingsCache'

export type PersistedView = {
  columnOrder: string[]
  columnWidths: Record<string, number>
  hiddenColumns: string[]
  frozenCount: number
  rowHeight: 'short' | 'medium' | 'tall' | 'extra-tall'
  // Active group-by column data prop, or null when grouping is off.
  // Persisted alongside column view settings so switching presets/tabs
  // restores grouping together with widths/order.
  groupBy?: string | null
}

export type PersistedSettings = {
  filters: unknown | null
  sort: unknown | null
  view: PersistedView | null
}

export type SettingsPatch = {
  filters?: unknown | null
  sort?: unknown | null
  view?: PersistedView | null
}

const ENDPOINT = '/api/user-view-settings'

export async function loadSettings(pageKey: string): Promise<PersistedSettings | null> {
  // In-session cache wins over the DB — if this tab has written a value
  // since page load, that's the authoritative state. This short-circuits
  // the POST-vs-GET race on SPA navigation: the write to cache happens
  // synchronously inside saveSettings, so by the time any subsequent
  // mount hits loadSettings the cache already has the post-resize value.
  const cached = readCache(pageKey)
  if (cached) return cached

  try {
    const res = await fetch(`${ENDPOINT}?page_key=${encodeURIComponent(pageKey)}`, {
      method: 'GET',
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[viewSettings.loadSettings] HTTP', res.status)
      return null
    }
    const json = (await res.json()) as {
      data?: { filters?: unknown; sort?: unknown; view?: unknown } | null
    }
    const row = json?.data
    if (!row) return null
    const settings: PersistedSettings = {
      filters: row.filters ?? null,
      sort: row.sort ?? null,
      view: normalizeView(row.view),
    }
    // Seed the cache from the DB so subsequent in-session loads skip
    // the GET even before any local save has occurred.
    writeCache(pageKey, settings)
    return settings
  } catch (err) {
    console.warn('[viewSettings.loadSettings] error', err)
    return null
  }
}

// Saves any subset of the three jsonb blobs. Logs failures to the console
// so they are visible during local verification (the previous "silent fail"
// behavior is what hid a broken save path from us).
//
// Writes the merged post-state to the in-session cache SYNCHRONOUSLY
// before firing the network request, so a mount that happens before the
// POST completes still sees the latest value.
export async function saveSettings(pageKey: string, patch: SettingsPatch): Promise<void> {
  // Merge with the current cache so `saveSettings(pageKey, {view})` doesn't
  // clobber filters/sort — matches the server-side merge semantics.
  const prev = readCache(pageKey)
  const next: PersistedSettings = {
    filters: 'filters' in patch ? patch.filters ?? null : prev?.filters ?? null,
    sort: 'sort' in patch ? patch.sort ?? null : prev?.sort ?? null,
    view: 'view' in patch ? patch.view ?? null : prev?.view ?? null,
  }
  writeCache(pageKey, next)

  try {
    const body: Record<string, unknown> = { page_key: pageKey }
    if ('filters' in patch) body.filters = patch.filters ?? null
    if ('sort' in patch) body.sort = patch.sort ?? null
    if ('view' in patch) body.view = patch.view ?? null

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // keepalive lets the request survive a page unload triggered right after
      // a debounced save fires (tab close, nav) without any extra plumbing.
      keepalive: true,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[viewSettings.saveSettings] HTTP', res.status, text)
    }
  } catch (err) {
    console.warn('[viewSettings.saveSettings] error', err)
  }
}

// Accepts arbitrary JSON and coerces to PersistedView, dropping anything
// malformed. Returning null lets callers treat partial data as "no saved view".
function normalizeView(raw: unknown): PersistedView | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const columnOrder = Array.isArray(r.columnOrder)
    ? r.columnOrder.filter((x): x is string => typeof x === 'string')
    : []

  const columnWidths: Record<string, number> = {}
  if (r.columnWidths && typeof r.columnWidths === 'object') {
    for (const [k, v] of Object.entries(r.columnWidths as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) columnWidths[k] = v
    }
  }

  const hiddenColumns = Array.isArray(r.hiddenColumns)
    ? r.hiddenColumns.filter((x): x is string => typeof x === 'string')
    : []

  const frozenCount = typeof r.frozenCount === 'number' && Number.isFinite(r.frozenCount) && r.frozenCount >= 0
    ? Math.floor(r.frozenCount)
    : 0

  const rowHeight: PersistedView['rowHeight'] =
    r.rowHeight === 'medium' || r.rowHeight === 'tall' || r.rowHeight === 'extra-tall'
      ? r.rowHeight
      : 'short'

  const groupBy = typeof r.groupBy === 'string' && r.groupBy ? r.groupBy : null

  return { columnOrder, columnWidths, hiddenColumns, frozenCount, rowHeight, groupBy }
}
