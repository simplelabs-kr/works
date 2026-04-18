// PageConfig — per-page plug for the generic DataGrid.
//
// A new page (production, trash, products, …) is spawned by authoring one
// of these objects and passing it as the `pageConfig` prop. DataGrid owns
// all the generic grid behavior (HOT wiring, column reorder, infinite
// scroll, filter/sort/search, undo/redo, view persistence, realtime
// subscription shell); PageConfig carries everything table-specific —
// API endpoints, column catalog, row-shape transforms, and any
// derived-field recomputation hooks the page needs.
//
// NOTE: Row/Item are currently typed to the Works shape because there is
// only one page today. When a second page (products, bundles) lands with
// a different row shape, this file will be genericized to
// `PageConfig<TItem, TRow>`. The prop surface won't change — callers will
// just start supplying the new shapes — so it is a non-breaking follow-up.

import type { Item, Row } from '@/features/works/worksTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridColumn = any

export type DerivedFieldContext = {
  holidays: Set<string>
}

export type PageConfig = {
  // user_view_settings.page_key — scopes persisted column order / widths /
  // filters / sorts per user per page.
  pageKey: string

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
  transformRow: (item: Item, ctx: DerivedFieldContext) => Row

  // Realtime UPDATE merge: given a prior row and the `payload.new` columns
  // from Supabase, produce the new row. Page-specific because the set of
  // synced fields (and any recomputed derived columns) varies per table.
  mergeRealtimeUpdate: (
    prev: Row,
    payloadNew: Record<string, unknown>,
    ctx: DerivedFieldContext
  ) => Row

  // Derived-field hook for local edits. Called after a user-initiated cell
  // change and on rollback; returns a partial row containing any derived
  // columns that must be updated alongside the primary edit. DataGrid
  // writes these back into HOT so read-only formula columns stay in sync.
  // Return `{}` when no derived column is affected by this edit.
  recomputeDerivedAfterEdit?: (
    prev: Row,
    field: string,
    candidateValue: unknown,
    ctx: DerivedFieldContext
  ) => Partial<Row>

  // Called when the business-calendar holiday set changes, for each loaded
  // row. Return the row with any workday-dependent derived fields
  // recomputed; returning the same reference signals "no change" and lets
  // DataGrid keep React state stable when the page has no such fields.
  recomputeDerivedOnHolidayChange?: (row: Row, holidays: Set<string>) => Row

  // When true, DataGrid renders a trash-only variant:
  //   - fetch endpoint receives `trashed_only: true`
  //   - every cell is readOnly (no editor, no checkbox toggle)
  //   - the bottom selection bar swaps 삭제 for 복구 / 영구삭제
  // Pages wanting this flip it on a variant PageConfig (e.g. works →
  // worksTrashConfig) so the trash page reuses the same column catalog,
  // view persistence, and fetch plumbing as the primary grid.
  trashedMode?: boolean
}
