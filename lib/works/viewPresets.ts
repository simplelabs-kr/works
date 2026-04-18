// Client helper for user_view_presets. Private MVP: each preset stores
// a name + filters/sort/view blobs scoped to (user, page). Favorites
// (`starred`) surface in the LNB 즐겨찾기 section and the Cmd+K palette.
//
// applyPreset overwrites the live user_view_settings row for the
// preset's page, then navigates to that page. The DataGrid mount path
// already reads user_view_settings on load, so the new chrome reflects
// the preset as soon as the page (re-)mounts. We use a hard location
// change so the fresh read is guaranteed even when navigating within
// the same route.

import { saveSettings } from './viewSettings'
import { resolvePageHrefForKey } from '@/lib/nav/pages'

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

// Apply a preset: overwrite the live user_view_settings row for its
// page, then hard-navigate there. Using window.location.href (not
// router.push) forces a full remount of the grid so the freshly-saved
// settings are read on mount — we don't need a runtime-swap codepath
// inside DataGrid for the MVP.
export async function applyPreset(preset: ViewPreset): Promise<void> {
  await saveSettings(preset.page_key, {
    filters: preset.filters,
    sort: preset.sort,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: preset.view as any,
  })
  const href = resolvePageHrefForKey(preset.page_key)
  if (href) {
    window.location.href = href
  } else {
    // Same-page apply with unknown target — reload in place as a fallback.
    window.location.reload()
  }
}
