// Personal view settings (per-user, per-page) for the Works grid.
//
// Shape of `view` jsonb stored in `user_view_settings`:
// - columnOrder:    data-prop keys in visual order (excludes the No. column).
// - columnWidths:   data-prop → px width. Keyed by prop so code-level column
//                   additions/renames don't misalign widths.
// - hiddenColumns:  data-prop keys currently hidden.
// - frozenCount:    number of visual columns frozen from the left
//                   (`fixedColumnsStart` in Handsontable).
// - rowHeight:      UI preset key — maps to ROW_HEIGHT_PX in WorksGrid.
//
// Save path is best-effort: any failure returns silently so the grid never
// surfaces a persistence error to the user. Load returns null on any failure.

export type PersistedView = {
  columnOrder: string[]
  columnWidths: Record<string, number>
  hiddenColumns: string[]
  frozenCount: number
  rowHeight: 'short' | 'medium' | 'tall' | 'extra-tall'
}

const ENDPOINT = '/api/user-view-settings'

export async function loadView(pageKey: string): Promise<PersistedView | null> {
  try {
    const res = await fetch(`${ENDPOINT}?page_key=${encodeURIComponent(pageKey)}`, {
      method: 'GET',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { view?: unknown } | null }
    const raw = json?.data?.view
    if (!raw || typeof raw !== 'object') return null
    return normalizeView(raw)
  } catch {
    return null
  }
}

export async function saveView(pageKey: string, view: PersistedView): Promise<void> {
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_key: pageKey, view }),
      // keepalive lets the request survive a page unload triggered right after
      // a debounced save fires (tab close, nav) without any extra plumbing.
      keepalive: true,
    })
  } catch {
    // silent fail — view persistence is best-effort
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

  return { columnOrder, columnWidths, hiddenColumns, frozenCount, rowHeight }
}
