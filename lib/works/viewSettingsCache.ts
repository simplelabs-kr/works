// In-memory, per-session cache of user_view_settings keyed by pageKey.
//
// Why: DB roundtrips across SPA navigation introduce a POST-vs-GET race.
// If a user resizes a column (POST, fire-and-forget via keepalive) and
// immediately soft-navigates to another /works/* route and back, the new
// DataGrid's mount restore fires a GET that can beat the pending POST to
// the server — the restore then applies stale widths and the user sees
// the resize "reset".
//
// This cache is the in-session source of truth. `saveSettings` writes
// the snapshot here synchronously before firing the POST, and
// `loadSettings` returns the cached entry when present (skipping the
// GET). On hard reload the module state is wiped, so the DB is used as
// the bootstrap source — which is why full refresh has always worked.
//
// Cache invalidation is implicit: entries live until the tab closes.
// Cross-tab/cross-device consistency is out of scope for MVP — the DB
// still ends up with the latest state via the fire-and-forget POST, so
// a second tab that hard-reloads will pick it up.

import type { PersistedSettings } from './viewSettings'

const cache = new Map<string, PersistedSettings>()

export function readCache(pageKey: string): PersistedSettings | undefined {
  return cache.get(pageKey)
}

export function writeCache(pageKey: string, value: PersistedSettings): void {
  cache.set(pageKey, value)
}

// Not currently used, but kept so a future "revert/discard" path can
// drop the in-memory view and force the next load to hit the DB.
export function clearCache(pageKey: string): void {
  cache.delete(pageKey)
}
