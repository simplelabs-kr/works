'use client'

// Per-pageKey remount counter subscribed to via useSyncExternalStore.
//
// Why: applyPreset used to hard-reload via window.location.href so the
// DataGrid would pick up the freshly-saved user_view_settings row on
// its next mount. The hard reload also tore down WorksShell/LNB, which
// caused the sidebar-collapse state to flicker and any non-DataGrid
// chrome to re-initialize for no good reason.
//
// Now applyPreset writes the preset into the in-session cache + DB,
// bumps the remount version for that pageKey, and returns. The page
// wrapper (WorksGrid / WorksTrashGrid) passes the version as `key` to
// <DataGrid/>. Same-pageKey preset applies remount only the grid;
// different-page applies go through router.push, which remounts the
// route's children naturally.

import { useSyncExternalStore } from 'react'

const versions = new Map<string, number>()
const listeners = new Map<string, Set<() => void>>()

export function bumpRemountVersion(pageKey: string): void {
  versions.set(pageKey, (versions.get(pageKey) ?? 0) + 1)
  const set = listeners.get(pageKey)
  if (set) set.forEach(cb => cb())
}

function subscribe(pageKey: string, cb: () => void): () => void {
  let set = listeners.get(pageKey)
  if (!set) {
    set = new Set()
    listeners.set(pageKey, set)
  }
  set.add(cb)
  return () => {
    set!.delete(cb)
    if (set!.size === 0) listeners.delete(pageKey)
  }
}

// useSyncExternalStore returns 0 on the server (no versions map
// access) and on the client reads from the in-memory map. Wrapper
// components use the value as a React `key` to force DataGrid remount
// when a preset for that pageKey lands.
export function useRemountVersion(pageKey: string): number {
  return useSyncExternalStore(
    cb => subscribe(pageKey, cb),
    () => versions.get(pageKey) ?? 0,
    () => 0,
  )
}
