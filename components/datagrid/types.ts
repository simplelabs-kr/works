// PageConfig — per-page plug for the generic DataGrid.
//
// A new page (production, trash, products, …) is spawned by authoring one
// of these objects and passing it as the `pageConfig` prop. DataGrid owns
// all the generic grid behavior (HOT wiring, column reorder, infinite
// scroll, filter/sort/search, undo/redo, view persistence, realtime
// subscription shell); PageConfig carries everything table-specific —
// API endpoints, column catalog, row-shape transforms, and any
// derived-field recomputation hooks the page needs.

import type { AttachmentItem, FieldType, ImageItem } from '@/features/works/worksTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridColumn = any

// Minimal shape every grid row must satisfy. DataGrid only touches `id`
// and (for the attachment column) `reference_files` directly; everything
// else is read through HOT's data API / renderers, so individual pages
// are free to carry any additional columns.
export type BaseRow = {
  id: string
  updated_at?: string | null
  images?: ImageItem[]
  reference_files?: AttachmentItem[]
  [key: string]: unknown
}

// Minimal DB row shape. Every page's transform consumes at least this.
export type BaseItem = {
  id: string
  updated_at?: string | null
  [key: string]: unknown
}

export type DerivedFieldContext = {
  holidays: Set<string>
}

export type PageConfig<TItem extends BaseItem = BaseItem, TRow extends BaseRow = BaseRow> = {
  // user_view_settings.page_key — scopes persisted column order / widths /
  // filters / sorts per user per page.
  pageKey: string

  // Human-readable label, shown in the LNB header and anywhere that
  // identifies the current page by name. Optional — callers without a
  // dedicated header fall back to the pageKey / pathname-derived label.
  pageName?: string

  // REST base used for row CRUD. DataGrid composes endpoints from this:
  //   POST   apiBase                  → list/search (with filters/sorts/search_term)
  //   PATCH  `${apiBase}/:id`         → single-field edit
  //   POST   `${apiBase}/bulk-delete` → soft delete
  //   POST   `${apiBase}/restore`     → restore from trash
  apiBase: string

  // Supabase realtime: DataGrid subscribes on `realtimeChannel` for UPDATE
  // events against `realtimeTable`. Merging the payload into the local row
  // is delegated to `mergeRealtimeUpdate` (page-specific field set).
  realtimeChannel: string
  realtimeTable: string

  // `field_options.table_name` used to hydrate select-column catalogs on
  // mount. Falls back to the hardcoded option map in worksRenderers on
  // fetch failure.
  selectOptionsTable: string

  // HOT column defs (augmented with fieldType). DataGrid uses this as the
  // canonical column catalog — PROP_TO_COL, widths state, filter columns,
  // sort columns, summary columns, and view persistence all derive from it.
  columns: DataGridColumn[]
  colHeaders: string[]

  // Editable Row field name → API field name accepted by the apiBase PATCH
  // endpoint. Keys not in this map are treated as read-only.
  editableFields: Record<string, string>

  // Row-shape transform: flat table row (Item) → display row (Row). Called
  // on every fetched page and every realtime INSERT. `ctx.holidays` is the
  // business-calendar holiday set (workday-dependent derived fields live
  // in the transform itself, not in DataGrid).
  transformRow: (item: TItem, ctx: DerivedFieldContext) => TRow

  // Realtime UPDATE merge: given a prior row and the `payload.new` columns
  // from Supabase, produce the new row. Page-specific because the set of
  // synced fields (and any recomputed derived columns) varies per table.
  mergeRealtimeUpdate: (
    prev: TRow,
    payloadNew: Record<string, unknown>,
    ctx: DerivedFieldContext
  ) => TRow

  // Derived-field hook for local edits. Called after a user-initiated cell
  // change and on rollback; returns a partial row containing any derived
  // columns that must be updated alongside the primary edit. DataGrid
  // writes these back into HOT so read-only formula columns stay in sync.
  // Return `{}` when no derived column is affected by this edit.
  recomputeDerivedAfterEdit?: (
    prev: TRow,
    field: string,
    candidateValue: unknown,
    ctx: DerivedFieldContext
  ) => Partial<TRow>

  // Called when the business-calendar holiday set changes, for each loaded
  // row. Return the row with any workday-dependent derived fields
  // recomputed; returning the same reference signals "no change" and lets
  // DataGrid keep React state stable when the page has no such fields.
  recomputeDerivedOnHolidayChange?: (row: TRow, holidays: Set<string>) => TRow

  // Group-by feature. `allowedTypes` lists which fieldTypes are eligible
  // to be used as grouping keys — the "그룹" dropdown filters the column
  // catalog against this set, so extending the feature to a new type is
  // just appending to the array (no per-column wiring). `defaultColumn`
  // is the initial grouping column (data prop) when no saved setting
  // exists; undefined means "no grouping by default".
  groupBy?: {
    enabled: boolean
    allowedTypes: FieldType[]
    defaultColumn?: string
  }

  // Add-row feature flag. When enabled, the page-level chrome may render
  // an "add row" control that POSTs to `${apiBase}` (or a page-specified
  // create endpoint) with a minimal payload. DataGrid itself does not
  // render the button today — the flag is read by page wrappers so a
  // single config switch is enough to turn the feature on/off per page.
  addRow?: {
    enabled: boolean
  }

  // Which view modes the page supports (e.g. 'grid', 'board', 'gallery').
  // Pages that only ship with the grid view can omit this; the default
  // is a grid-only surface. Consumed by view-switcher chrome when present.
  viewTypes?: string[]

  // Initial-load policy. 'auto' (default) kicks off a data fetch on
  // mount using whatever saved filter/search the user had (or none —
  // the server returns the first page of the whole table).
  // 'require-filter' instead waits until the user applies a filter or
  // runs a search before fetching. Useful for base tables that have
  // no inherent date scoping (e.g. products): opening the page with
  // no saved filter should not dump the entire table into the grid.
  initialLoadPolicy?: 'auto' | 'require-filter'

  // When true, DataGrid renders a trash-only variant:
  //   - fetch endpoint receives `trashed_only: true`
  //   - every cell is readOnly (no editor, no checkbox toggle)
  //   - the bottom selection bar swaps 삭제 for 복구 / 영구삭제
  // Pages wanting this flip it on a variant PageConfig (e.g. works →
  // worksTrashConfig) so the trash page reuses the same column catalog,
  // view persistence, and fetch plumbing as the primary grid.
  trashedMode?: boolean
}
