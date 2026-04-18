'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'
import { supabase } from '@/lib/supabase/client'
import SummaryBar from '@/components/works/SummaryBar'
import type { SummaryColDef } from '@/components/works/SummaryBar'
import FilterModal from '@/components/works/FilterModal'
import type { RootFilterState, FilterColDef } from '@/components/works/FilterModal'
import { countAllConditions } from '@/components/works/FilterModal'
import SortModal from '@/components/works/SortModal'
import type { SortCondition, SortColDef } from '@/components/works/SortModal'
import ImageModal from '@/components/works/ImageModal'
import ColumnManagerDropdown from '@/components/works/ColumnManagerDropdown'
import type { ManagedColumn } from '@/components/works/ColumnManagerDropdown'
import ShortcutsModal from '@/components/works/ShortcutsModal'
import { type PersistedView, type PersistedSettings } from '@/lib/works/viewSettings'
import { loadEffectiveSettings, persistViewPatch } from '@/lib/works/viewPresets'
import { usePresets } from '@/components/nav/PresetsContext'
import type { FieldType, ImageItem, AttachmentItem, Row } from '@/features/works/worksTypes'
import { getFieldTypeIcon } from '@/features/works/worksConfig'
import {
  getFilterSelectOptions,
  getSelectColumnOptions,
  rendererBridge,
  resetRendererBridge,
  setSelectColumnOptions,
} from '@/features/works/worksRenderers'
import type { PageConfig } from './types'

// Row height presets. Values are the actual row px height used for both the CSS
// var (--grid-row-h) and HOT's rowHeights option. Keeping them in lockstep is
// critical — divergence is what caused the earlier "fixed No. column drift" bug.
type RowHeight = 'short' | 'medium' | 'tall' | 'extra-tall'
const ROW_HEIGHT_PX: Record<RowHeight, number> = {
  'short': 32,
  'medium': 48,
  'tall': 64,
  'extra-tall': 96,
}
const ROW_HEIGHT_LABEL: Record<RowHeight, string> = {
  'short': 'Short',
  'medium': 'Medium',
  'tall': 'Tall',
  'extra-tall': 'Extra Tall',
}
// Image thumbnail size per row height. Applies to every `fieldType: 'image'`
// column via the shared --grid-thumb-size CSS var (globals.css .image-thumb).
const ROW_THUMB_PX: Record<RowHeight, number> = {
  'short': 24,
  'medium': 36,
  'tall': 52,
  'extra-tall': 80,
}
// Supabase Storage image transform width — chosen ≈ 2× thumb px for retina,
// capped at sensible values to keep payloads small on Short/Medium.
const ROW_THUMB_URL_W: Record<RowHeight, number> = {
  'short': 48,
  'medium': 72,
  'tall': 104,
  'extra-tall': 160,
}

// Debounce delay for server-side search
const SEARCH_DEBOUNCE_MS = 500

// Column definitions, select options, editable-field map, renderers,
// getFieldTypeIcon, and related types all live in features/works now —
// imported above. This file holds DataGrid/HOT wiring only.



// ── Main component ───────────────────────────────────────────────────────────

export default function DataGrid({ pageConfig }: { pageConfig: PageConfig }) {
  // Destructure into local consts that shadow the old module-scope names
  // (COLUMNS / COL_HEADERS / EDITABLE_FIELD_MAP / VIEW_PAGE_KEY). Keeps the
  // body of the component unchanged while the column catalog, editable map,
  // and persistence key now flow from pageConfig. The per-page API endpoints
  // and realtime wiring are also pulled from pageConfig so a new page can
  // reuse this grid with nothing but a new PageConfig object.
  const {
    columns: COLUMNS,
    colHeaders: COL_HEADERS,
    editableFields: EDITABLE_FIELD_MAP,
    pageKey: VIEW_PAGE_KEY,
    apiBase,
    realtimeChannel,
    realtimeTable,
    selectOptionsTable,
    transformRow,
    mergeRealtimeUpdate,
    recomputeDerivedAfterEdit,
    recomputeDerivedOnHolidayChange,
    addRow,
    trashedMode,
  } = pageConfig
  // "+ 추가" is always suppressed in the trash view — you can't create
  // rows into a soft-deleted bucket.
  const addRowEnabled = !!addRow?.enabled && !trashedMode

  // Prop → column index cache. Derived from pageConfig.columns; recomputes
  // only when the catalog itself changes. Hot path — HOT's propToCol() does
  // an O(n) scan on every afterChange call, so we precompute a Map instead.
  const PROP_TO_COL = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(COLUMNS as any[]).forEach((c, i) => {
      if (typeof c.data === 'string' && c.data) m[c.data] = i
    })
    return m
  }, [COLUMNS])

  const containerRef = useRef<HTMLDivElement>(null)
  const hotContainerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<Handsontable | null>(null)
  const holidaysLoaded = useRef(false)

  // Refs for infinite scroll and stale-closure-safe access in HOT hooks
  const rowsRef = useRef<Row[]>([])
  const hasMoreRef = useRef(true)
  const isScrollLoadingRef = useRef(false)
  const scrollLoadRef = useRef<(() => void) | null>(null)
  const holidaySetRef = useRef<Set<string>>(new Set())
  const checkedRowsRef = useRef<Set<string>>(new Set())
  const lastCheckedRowRef = useRef<number | null>(null)

  // Optimistic "+ 추가" rows. Tracks ids that were INSERTed client-side but
  // haven't yet appeared in a server fetch response (flat_order_details
  // only materializes after order_id/product_id are filled in). We pin
  // these rows at the top of the grid; each fetch-replace dedupes by id —
  // optimistic ids that now show up in the server response are removed
  // from this set (server-side data takes over), the rest stay pinned.
  const optimisticRowIdsRef = useRef<Set<string>>(new Set())
  const addingRowRef = useRef(false)

  // Custom undo/redo stacks (HOT native undo resets whenever loadData() runs).
  // Each entry is a batch — all cell changes from a single afterChange invocation
  // (e.g. multi-cell Delete) collapse into one undo step. Items are keyed by rowId
  // so replay survives sort/infinite-scroll row reordering.
  const undoStackRef = useRef<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>([])
  const redoStackRef = useRef<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>([])
  const UNDO_LIMIT = 20

  // Set to true by cell-edit flows to skip the full `hot.loadData()` reload on the
  // following `setRows` — HOT's internal data is already up to date via setDataAtCell,
  // so we avoid the O(visible_rows × columns) re-render. Structural changes
  // (initial load, infinite-scroll, filter/sort, soft delete, realtime) leave this
  // false so loadData still runs.
  const skipNextLoadRef = useRef(false)

  const selectMenuRef = useRef<HTMLDivElement>(null)
  const [selectMenu, setSelectMenu] = useState<{ top: number; left: number; row: number; width: number; column: string; options: { value: string; bg: string }[] } | null>(null)

  const summaryInnerRef = useRef<HTMLDivElement>(null)
  const customScrollbarRef = useRef<HTMLDivElement>(null)
  const customScrollbarInnerRef = useRef<HTMLDivElement>(null)
  const customVScrollbarRef = useRef<HTMLDivElement>(null)
  const customVScrollbarInnerRef = useRef<HTMLDivElement>(null)
  const scrollFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncingCustomScrollRef = useRef(false)
  const syncingCustomVScrollRef = useRef(false)
  const [colWidths, setColWidths] = useState<number[]>((COLUMNS as any[]).map((c: any) => c.width ?? 100)) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[] | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [galleryImages, setGalleryImages] = useState<ImageItem[] | null>(null)
  const [galleryStartIdx, setGalleryStartIdx] = useState(0)

  // Register module-level globals used by HOT cell renderers (they can't access React closures).
  // On unmount, null them out so stale references from a previous mount don't leak
  // into a subsequent one (StrictMode, route re-entry).
  useEffect(() => {
    rendererBridge.onImageGallery = (imgs, startIdx) => { setGalleryImages(imgs); setGalleryStartIdx(startIdx) }
    rendererBridge.checkedRowsRef = checkedRowsRef
    rendererBridge.lastCheckedRowRef = lastCheckedRowRef
    rendererBridge.setSelectedRowIds = setSelectedRowIds
    rendererBridge.hotRef = hotRef
    return () => {
      resetRendererBridge()
    }
  }, [])

  // Hydrate select-column options from Supabase `field_options`. Renderers
  // and the per-cell popup read from the module-level catalog, so we call
  // the setter and then force a HOT re-render to recolor existing select
  // cells. FilterModal reads from state (`filterSelectOptions`) so it
  // picks up the new values on the next render. Failures are swallowed —
  // the hardcoded fallback keeps the grid fully functional.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/field-options?table=${encodeURIComponent(selectOptionsTable)}`)
        if (!res.ok) return
        const body = (await res.json()) as { data?: Record<string, { value: string; bg: string }[]> }
        if (cancelled || !body?.data) return
        setSelectColumnOptions(body.data)
        setFilterSelectOptions(getFilterSelectOptions())
        hotRef.current?.render()
      } catch {
        // keep fallback silently
      }
    })()
    return () => { cancelled = true }
  }, [])

  const [rows, setRows] = useState<Row[]>([])
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  // FilterModal's selectOptions prop. Initial value mirrors the hardcoded
  // fallback in worksRenderers; replaced on mount by the /api/field-options
  // response so the filter dropdowns stay aligned with the grid's own
  // dropdowns (both sources are the same catalog).
  const [filterSelectOptions, setFilterSelectOptions] = useState<Record<string, string[]>>(
    () => getFilterSelectOptions()
  )
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; undoAction?: () => void } | null>(null)
  // 토스트 auto-dismiss 타이머. 새 토스트가 뜨면 이전 타이머를 cancel하여
  // 다중 토스트가 서로의 dismiss 타이밍에 간섭하지 않도록 한다. Unmount 시 cleanup.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((t: { message: string; type: 'success' | 'error'; undoAction?: () => void } | null, autoDismissMs?: number) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(t)
    if (t && autoDismissMs != null) {
      toastTimerRef.current = setTimeout(() => {
        setToast(null)
        toastTimerRef.current = null
      }, autoDismissMs)
    }
  }, [])
  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  // Register attachment upload/delete handlers on the module-level globals.
  // Previously these were assigned in the render body, creating new closures on every
  // render. The handlers only read stable refs/callbacks, so a single mount-time
  // assignment is equivalent and avoids per-render allocation.
  useEffect(() => {
    rendererBridge.onAttachmentUpload = async (rowIdx, files) => {
      const rowData = rowsRef.current[rowIdx]
      if (!rowData?.id) return
      const existing = rowData.reference_files ?? []
      const uploaded: AttachmentItem[] = []
      const failed: string[] = []
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        form.append('order_item_id', rowData.id)
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: form })
          if (!res.ok) {
            const raw = await res.text()
            let errBody = raw.slice(0, 500)
            try {
              const j = JSON.parse(raw) as { error?: string }
              if (j.error) errBody = j.error.slice(0, 500)
            } catch { /* keep raw */ }
            if (res.status === 413) failed.push(`${file.name} (최대 4.5MB)`)
            else {
              const hint = errBody.length > 80 ? `${errBody.slice(0, 80)}…` : errBody
              failed.push(hint ? `${file.name} (${res.status}: ${hint})` : `${file.name} (HTTP ${res.status})`)
            }
            continue
          }
          const item = await res.json()
          uploaded.push({ url: item.url, name: item.name })
        } catch { failed.push(file.name) }
      }
      if (failed.length > 0) {
        showToast({ message: `${failed.length}개 파일 업로드 실패: ${failed.join(', ')}`, type: 'error' }, 3000)
      }
      if (uploaded.length === 0) return
      const newFiles = [...existing, ...uploaded]
      const previousRows = rowsRef.current
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, reference_files: newFiles } : r))
      const res = await fetch(`${apiBase}/${rowData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'reference_files', value: newFiles }),
      })
      if (!res.ok) {
        setRows(previousRows)
        showToast({ message: '파일 저장에 실패했습니다', type: 'error' }, 2000)
      }
    }

    rendererBridge.onAttachmentDelete = async (rowIdx, fileIdx) => {
      const rowData = rowsRef.current[rowIdx]
      if (!rowData?.id) return
      const existing = rowData.reference_files ?? []
      const newFiles = existing.filter((_, i) => i !== fileIdx)
      const previousRows = rowsRef.current
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, reference_files: newFiles } : r))
      const res = await fetch(`${apiBase}/${rowData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'reference_files', value: newFiles }),
      })
      if (!res.ok) {
        setRows(previousRows)
        showToast({ message: '파일 삭제에 실패했습니다', type: 'error' }, 2000)
      }
    }
  }, [showToast])

  const [filterCount, setFilterCount] = useState<number | null>(null)
  const [searchCount, setSearchCount] = useState<number | null>(null)

  // Server-side search with debounce
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTermRef = useRef('')

  // Filter/Sort modal state
  const [filterState, setFilterState] = useState<RootFilterState>({ logic: 'AND', conditions: [] })
  const [sortConditions, setSortConditions] = useState<SortCondition[]>([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)

  // Grid personalization state (Phase 1: in-memory only; Phase 2 will persist).
  const [rowHeight, setRowHeight] = useState<RowHeight>('short')
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  // Number of leftmost visual columns currently frozen. We drive
  // HOT's `fixedColumnsStart` option ourselves (Airtable-style "freeze up to
  // here" — always freezes columns 1..N). Tracked via state so handleResetView
  // and future Phase 2 persistence can read/write a single value.
  const [frozenCount, setFrozenCount] = useState(0)
  // Mirror of frozenCount for the contextMenu callbacks, which close over
  // stale values at HOT-init time. Updated on every state change below.
  const frozenCountRef = useRef(0)
  // Bumped whenever HOT's visual column order changes (header drag, modal
  // drag reorder, or programmatic manualColumnMove). Used as a useMemo dep
  // so `managedColumns` reflects the current visual order in the dropdown.
  const [columnOrderVersion, setColumnOrderVersion] = useState(0)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showRowHeightMenu, setShowRowHeightMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const columnManagerRef = useRef<HTMLDivElement>(null)
  const rowHeightMenuRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  // Mirror of rowHeight in px for the modifyRowHeight HOT hook.
  // The hook closure at init time would otherwise capture the initial value forever;
  // reading from a ref keeps HOT's internal row-height computation in sync with state.
  const rowHeightPxRef = useRef<number>(ROW_HEIGHT_PX.short)
  const filterStateRef = useRef<RootFilterState>({ logic: 'AND', conditions: [] })
  const sortConditionsRef = useRef<SortCondition[]>([])
  // Mirrors of state used by computeLiveSnapshot (below). Kept in lockstep
  // via effects so the registry's getSnapshot can read the true current
  // values synchronously — it cannot touch state directly because the
  // registry entry is created inside an effect with its own closure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colWidthsRef = useRef<number[]>((COLUMNS as any[]).map((c: any) => c.width ?? 100))
  const hiddenColumnsRef = useRef<Set<string>>(new Set())
  const rowHeightRef = useRef<RowHeight>('short')

  // Active preset id for this page. When non-null, view edits PATCH
  // that preset's row instead of writing to the shared
  // user_view_settings "default view" row — so every preset keeps its
  // own filters/sort/view independently. Mirrored into a ref so the
  // save effect / flush path can read it synchronously at save time
  // without needing the context value in their dep list.
  const { activeByPage } = usePresets()
  const activePresetId = activeByPage[VIEW_PAGE_KEY] ?? null
  const activePresetIdRef = useRef<string | null>(null)

  // Data load trigger (incremented by handleLoad)
  const [offset, setOffset] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const isAppend = useRef(false)
  const dataLoaded = useRef(false) // true after first successful load

  // Sync refs after render commits. Writing refs in the render body violates React's
  // "no side-effects during render" guidance (StrictMode double-invocation, concurrent
  // rendering) even if it happens to work today. All consumers of these refs run in
  // async HOT hooks / scroll callbacks that fire after commit, so the effect-based
  // sync is functionally equivalent and future-proof.
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { holidaySetRef.current = holidaySet }, [holidaySet])
  useEffect(() => { filterStateRef.current = filterState }, [filterState])
  useEffect(() => { sortConditionsRef.current = sortConditions }, [sortConditions])
  useEffect(() => { searchTermRef.current = searchTerm }, [searchTerm])
  useEffect(() => { colWidthsRef.current = colWidths }, [colWidths])
  useEffect(() => { hiddenColumnsRef.current = hiddenColumns }, [hiddenColumns])
  useEffect(() => { rowHeightRef.current = rowHeight }, [rowHeight])
  useEffect(() => { activePresetIdRef.current = activePresetId }, [activePresetId])

  // Stable scroll-load callback (read by HOT afterScrollVertically hook).
  // Assigned in an effect so it's refreshed after commit, not during render.
  useEffect(() => {
    scrollLoadRef.current = () => {
      if (isScrollLoadingRef.current) return
      if (!hasMoreRef.current) return
      isScrollLoadingRef.current = true
      isAppend.current = true
      setOffset(o => o + 100)
    }
  }, [])

  const handleLoad = () => {
    isAppend.current = false
    setOffset(0)
    hasMoreRef.current = true
    setFilterCount(null)
    setSearchCount(null)
    setFetchTrigger(n => n + 1)
  }

  // Debounced search input → triggers server reload
  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchTerm(value.trim())
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  // searchTerm change → reload data from server
  useEffect(() => {
    if (fetchTrigger === 0 && !searchTerm) return // skip if never loaded and no search
    isAppend.current = false
    setOffset(0)
    hasMoreRef.current = true
    setFilterCount(null)
    setSearchCount(null)
    setFetchTrigger(n => n + 1)
  }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectOption = (column: string, rowIdx: number, value: string) => {
    const hot = hotRef.current
    if (!hot) return
    const col = propToColRef.current[column] ?? -1
    if (col < 0) return
    // Route through setDataAtCell so afterChange handles PATCH, local state, and undo-stack tracking.
    hot.setDataAtCell(rowIdx, col, value)
    setSelectMenu(null)
  }

  useEffect(() => {
    if (!selectMenu) return
    const handler = (e: MouseEvent) => {
      if (!selectMenuRef.current?.contains(e.target as Node)) setSelectMenu(null)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [selectMenu])

  const hasData = dataLoaded.current && rows.length > 0

  // Load holidays once on mount
  useEffect(() => {
    if (holidaysLoaded.current) return
    holidaysLoaded.current = true
    fetch('/api/holidays')
      .then(res => res.json())
      .then(({ dates }) => {
        if (Array.isArray(dates)) setHolidaySet(new Set<string>(dates))
      })
  }, [])

  // holidaySet 로드/변경 시 rows의 파생 컬럼(출고예정일 등) 재계산.
  // 파생 컬럼이 없는 페이지는 pageConfig.recomputeDerivedOnHolidayChange를
  // 제공하지 않으므로 이 이펙트는 조기 종료한다.
  useEffect(() => {
    if (!recomputeDerivedOnHolidayChange) return
    if (holidaySet.size === 0) return
    setRows(prev => {
      if (prev.length === 0) return prev
      return prev.map(row => recomputeDerivedOnHolidayChange(row, holidaySet))
    })
  }, [holidaySet, recomputeDerivedOnHolidayChange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch data on filter/sort change (triggered by handleLoad via fetchTrigger)
  useEffect(() => {
    if (fetchTrigger === 0) return // skip initial mount

    const shouldAppend = isAppend.current
    isAppend.current = false

    let cancelled = false
    if (shouldAppend) setLoadingMore(true)
    else setLoading(true)
    setApiError(null)

    const apiFilters = filterStateRef.current
    const apiSorts = sortConditionsRef.current.map(({ column, direction }) => ({ column, direction }))

    fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset,
        filters: apiFilters,
        sorts: apiSorts,
        search_term: searchTermRef.current || null,
        trashed_only: !!trashedMode,
      }),
    })
      .then(res => res.json())
      .then(({ data, error, filterCount: fc, searchCount: sc }) => {
        if (cancelled) return
        if (error) { setApiError(error); return }
        const items = data ?? []
        const mapped = items.map((item: Parameters<typeof transformRow>[0]) =>
          transformRow(item, { holidays: holidaySetRef.current })
        )
        if (items.length < 100) hasMoreRef.current = false
        if (shouldAppend) {
          setRows(prev => [...prev, ...mapped])
        } else {
          // Dedupe optimistic "+ 추가" rows against server response. Ids
          // that now appear server-side have materialized (e.g. works:
          // flat_order_details picked them up after order_id/product_id
          // were set) — drop them from the optimistic set so the server
          // copy wins. Ids still missing stay pinned at the top.
          if (optimisticRowIdsRef.current.size > 0) {
            const serverIds = new Set<string>(mapped.map((r: Row) => r.id))
            for (const id of Array.from(optimisticRowIdsRef.current)) {
              if (serverIds.has(id)) optimisticRowIdsRef.current.delete(id)
            }
            const pinnedRows = rowsRef.current.filter(r =>
              optimisticRowIdsRef.current.has(r.id) && !serverIds.has(r.id)
            )
            setRows([...pinnedRows, ...mapped])
          } else {
            setRows(mapped)
          }
          if (fc != null) setFilterCount(Number(fc))
          if (sc != null) setSearchCount(Number(sc))
          else setSearchCount(null)
        }
        dataLoaded.current = true
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setLoadingMore(false); isScrollLoadingRef.current = false }
      })

    return () => { cancelled = true }
  }, [offset, fetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize HOT height to fill its container
  useEffect(() => {
    if (!hotContainerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 0 && hotRef.current) {
          hotRef.current.updateSettings({ height: h })
        }
      }
    })
    ro.observe(hotContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Horizontal wheel handler — drives master.scrollLeft directly.
  //
  // With master's native scrollbars hidden (see globals.css), the default
  // browser scroll behavior on wtHolder still works for vertical wheels
  // (deltaY-dominant) — those fall through to HOT's native scroll path.
  //
  // For horizontal-dominant wheels we:
  //   1. preventDefault, which ALSO prevents macOS trackpad's back/forward
  //      swipe navigation (deltaX without preventDefault triggers it).
  //   2. manually write master.scrollLeft += deltaX. HOT's Overlays plugin
  //      syncs ht_clone_top.scrollLeft = master.scrollLeft. Because
  //      master.clientWidth === top.clientWidth (no vertical scrollbar
  //      gutter), master.max === top.max, so the sync is exact at every
  //      value. No clamp needed, no header/body drift possible.
  //
  // Capture phase + stopPropagation ensures no double-scroll if a HOT
  // plugin ever adds a wheel listener of its own. A vertical wheel
  // dispatched together with a small deltaX still counts as vertical here
  // (early-return), so row-scrolling behavior is unchanged.
  useEffect(() => {
    const el = hotContainerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      e.stopPropagation()
      const masterEl = hotRef.current?.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
      if (!masterEl) return
      const maxScroll = masterEl.scrollWidth - masterEl.clientWidth
      if (maxScroll <= 0) return
      const next = Math.max(0, Math.min(masterEl.scrollLeft + e.deltaX, maxScroll))
      if (masterEl.scrollLeft !== next) masterEl.scrollLeft = next
      // master.scroll fires → our master listener syncs customBar + summary
      // + the is-scrolled-x shadow class. No need to touch them here.
    }
    el.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => el.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  // Initialize Handsontable once
  useEffect(() => {
    if (!containerRef.current || hotRef.current) return
    hotRef.current = new Handsontable(containerRef.current, {
      data: [],
      columns: COLUMNS,
      colWidths: COLUMNS.map(c => c.width),
      rowHeaders: false,
      colHeaders: COL_HEADERS,
      readOnly: true,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      height: hotContainerRef.current?.clientHeight || 600,
      wordWrap: false,
      autoRowSize: false,
      autoColumnSize: false,
      manualColumnResize: true,
      manualColumnMove: true,
      // manualColumnFreeze plugin intentionally disabled — it freezes a single
      // column by moving it to the front, which fights our "freeze from first
      // to selected column" (Airtable/Excel) UX. We drive fixedColumnsStart
      // directly via updateSettings in response to contextMenu actions.
      // HiddenColumns plugin — driven via updateSettings in the effect below.
      // indicators:false keeps the header visually stable; our own "컬럼 관리" dropdown is the UX.
      hiddenColumns: { columns: [], indicators: false },
      columnHeaderHeight: 33,
      rowHeights: ROW_HEIGHT_PX[rowHeight],
      fixedColumnsStart: 0,
      outsideClickDeselects: (target: HTMLElement) => {
        if (selectMenuRef.current?.contains(target)) return false
        if (customScrollbarRef.current?.contains(target)) return false
        if (customVScrollbarRef.current?.contains(target)) return false
        return true
      },
      enterBeginsEditing: true,
      enterMoves: { row: 1, col: 0 },
      tabMoves: { row: 0, col: 1 },
      // Trash view is read-only across every cell. Override per-column
      // `readOnly: false` (e.g. works 데드라인, 중량) and disable their
      // editors so checkbox/select renderers also stop responding to
      // toggles. Non-trash pages leave cell meta untouched.
      cells: trashedMode ? () => ({ readOnly: true, editor: false }) : undefined,
      // Custom context menu: Airtable-style freeze semantics.
      // - "여기까지 고정": set fixedColumnsStart = clickedVisualCol + 1
      //   (freezes columns 1..N, where N is the clicked column, 1-indexed).
      // - "고정 해제": clear all frozen columns.
      // Callbacks use frozenCountRef to avoid stale closures from init-time.
      contextMenu: {
        items: {
          'freeze_up_to_here': {
            name() { return '여기까지 고정' },
            disabled() {
              const hot = hotRef.current
              if (!hot) return true
              const sel = hot.getSelectedLast()
              if (!sel) return true
              const col = sel[1]
              if (typeof col !== 'number' || col < 0) return true
              // Already the last frozen column — freezing again is a no-op.
              return col + 1 === frozenCountRef.current
            },
            callback: (_key: string, selection: Array<{ start: { col: number } }>) => {
              const col = selection?.[0]?.start?.col
              if (typeof col !== 'number' || col < 0) return
              const hot = hotRef.current
              if (!hot) return
              const n = col + 1
              hot.updateSettings({ fixedColumnsStart: n })
              setFrozenCount(n)
            },
          },
          'unfreeze_all': {
            name() { return '고정 해제' },
            disabled() { return frozenCountRef.current === 0 },
            callback: () => {
              const hot = hotRef.current
              if (!hot) return
              hot.updateSettings({ fixedColumnsStart: 0 })
              setFrozenCount(0)
            },
          },
          'hide_column': {
            name() { return '이 컬럼 숨기기' },
            disabled() {
              const hot = hotRef.current
              if (!hot) return true
              const sel = hot.getSelectedLast()
              if (!sel) return true
              const vi = sel[1]
              // Visual col 0 is the first column — allow hiding it too, but
              // block when there's no valid selection.
              return typeof vi !== 'number' || vi < 0
            },
            callback: (_key: string, selection: Array<{ start: { col: number } }>) => {
              const vi = selection?.[0]?.start?.col
              if (typeof vi !== 'number' || vi < 0) return
              const hot = hotRef.current
              if (!hot) return
              const pi = hot.toPhysicalColumn(vi)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const colDef = (effectiveColumnsRef.current as any[])[pi]
              const prop = colDef?.data
              if (!prop) return
              setHiddenColumns(prev => {
                if (prev.has(prop)) return prev
                const next = new Set(prev)
                next.add(prop)
                return next
              })
            },
          },
        },
      },
      // Disable HOT native UndoRedo plugin — we implement a custom stack that
      // survives loadData resets and syncs DB. With the skipNextLoadRef
      // optimization HOT's internal stack is no longer reset per edit, so its
      // Cmd+Z handler would otherwise race with our window listener and move
      // the cell selection.
      undo: false,
    })

    // Master-viewport scroll listener — observes only, never writes
    // master/top scrollLeft. With the native vertical scrollbar removed
    // from master (globals.css), master.clientWidth === top.clientWidth,
    // and HOT's internal Overlays sync keeps top.scrollLeft locked to
    // master.scrollLeft at the exact pixel — no drift, no clamp needed.
    //
    // Its only job is to reflect the master's scroll state into visual
    // adjuncts (custom bars, summary translate, frozen-columns shadow).
    //
    // Perf note: we tried batching the writes into requestAnimationFrame,
    // but that introduced a ~1-frame lag between HOT's header (synced by
    // HOT's own Overlays during the same scroll tick) and our summary
    // transform / overlay bars, causing a visible jitter during
    // momentum scroll. We write synchronously — same tick as HOT's own
    // sync — and use equality guards to skip no-op writes so repeated
    // ticks at identical positions don't thrash the compositor.
    setTimeout(() => {
      if (!hotRef.current) return
      const masterEl = hotRef.current.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
      if (!masterEl) return
      let lastX = -1
      let lastY = -1
      let lastShadowOn: boolean | null = null
      let lastOpacityOn = false
      masterEl.addEventListener('scroll', () => {
        const x = masterEl.scrollLeft
        const y = masterEl.scrollTop
        if (x !== lastX) {
          lastX = x
          // Frozen-column shadow — only toggle when state flips.
          const shadowOn = x > 0
          if (shadowOn !== lastShadowOn) {
            const rootEl = hotRef.current?.rootElement as HTMLElement | undefined
            if (rootEl) rootEl.classList.toggle('is-scrolled-x', shadowOn)
            lastShadowOn = shadowOn
          }
          if (summaryInnerRef.current) {
            // translate3d (not translateX) promotes the element to its
            // own compositor layer — transform animates on the GPU.
            summaryInnerRef.current.style.transform = `translate3d(${-x}px, 0, 0)`
          }
          // Mirror into custom horizontal bar (guarded against feedback).
          if (!syncingCustomScrollRef.current && customScrollbarRef.current
              && customScrollbarRef.current.scrollLeft !== x) {
            syncingCustomScrollRef.current = true
            customScrollbarRef.current.scrollLeft = x
            syncingCustomScrollRef.current = false
          }
        }
        if (y !== lastY) {
          lastY = y
          if (!syncingCustomVScrollRef.current && customVScrollbarRef.current
              && customVScrollbarRef.current.scrollTop !== y) {
            syncingCustomVScrollRef.current = true
            customVScrollbarRef.current.scrollTop = y
            syncingCustomVScrollRef.current = false
          }
        }
        // Fade bars in; schedule fade-out. Guard the opacity write so
        // repeated scroll ticks while already lit don't re-invalidate.
        if (!lastOpacityOn) {
          if (customScrollbarRef.current) customScrollbarRef.current.style.opacity = '1'
          if (customVScrollbarRef.current) customVScrollbarRef.current.style.opacity = '1'
          lastOpacityOn = true
        }
        if (scrollFadeTimerRef.current) clearTimeout(scrollFadeTimerRef.current)
        scrollFadeTimerRef.current = setTimeout(() => {
          if (customScrollbarRef.current) customScrollbarRef.current.style.opacity = '0'
          if (customVScrollbarRef.current) customVScrollbarRef.current.style.opacity = '0'
          lastOpacityOn = false
        }, 1000)
      }, { passive: true })
    }, 100)

    // After every HOT render, align the custom overlay bars' inner sizes
    // to the master viewport's actual scrollable dimensions. HOT's render
    // is where hide/show/resize/move/data-load ultimately show up, so
    // this is the single, reliable place to keep the bars honest.
    //
    // Horizontal: use master.scrollWidth (HOT's Overlays sync guarantees
    // master.scrollWidth === top.scrollWidth, and master is what drives
    // scroll now, so reading master is correct). Horizontal inner width
    // must exactly match master.scrollWidth — otherwise customBar.max
    // can drift from master.max and the thumb position becomes
    // visually incorrect at the right edge.
    //
    // Vertical: use master.scrollHeight so the vertical bar's max
    // matches master's vertical scroll range.
    hotRef.current.addHook('afterRender', () => {
      const masterEl = hotRef.current?.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
      if (!masterEl) return
      const hInner = customScrollbarInnerRef.current
      if (hInner) {
        const target = masterEl.scrollWidth
        if (parseFloat(hInner.style.width) !== target) {
          hInner.style.width = `${target}px`
        }
      }
      const vInner = customVScrollbarInnerRef.current
      if (vInner) {
        const target = masterEl.scrollHeight
        if (parseFloat(vInner.style.height) !== target) {
          vInner.style.height = `${target}px`
        }
      }
    })

    // Clear the `data-select-col` marker on every cell before its renderer
    // runs. HOT recycles TDs across columns during virtualization, so a td
    // that last rendered a select column keeps `data-select-col="true"`
    // when it gets reused for a checkbox/image/text column — and the CSS
    // `td[data-select-col].current::after` rule then paints a chevron on
    // non-select cells. Clearing here guarantees only the select renderer
    // (renderSelectBadge with editable=true) can re-set the marker, so
    // the chevron appears exclusively on editable select cells.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('beforeRenderer', (td: HTMLTableCellElement) => {
      if (td.dataset.selectCol) delete td.dataset.selectCol
    })

    // Field type icons via DOM manipulation (avoids HOT HTML escaping)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterGetColHeader', (col: number, TH: HTMLTableCellElement) => {
      // Layout styles (vertical-align, line-height, padding, .colHeader sizing)
      // are handled via globals.css. Avoid writing them here on every header
      // re-render — HOT calls this hook during horizontal virtualization, so
      // redundant inline style writes thrash layout and cause visible flicker
      // during left/right scroll.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (effectiveColumnsRef.current as any[])[col]
      if (!colDef || !colDef.fieldType) return
      if (TH.querySelector('.field-type-icon')) return
      const div = TH.querySelector('.colHeader') as HTMLElement | null
      if (!div) return
      const icon = document.createElement('span')
      icon.className = 'field-type-icon'
      icon.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;flex-shrink:0;'
      icon.innerHTML = getFieldTypeIcon(colDef.fieldType as FieldType)
      const textSpan = document.createElement('span')
      textSpan.style.overflow = 'hidden'
      textSpan.style.textOverflow = 'ellipsis'
      textSpan.style.whiteSpace = 'nowrap'
      textSpan.style.minWidth = '0'
      textSpan.textContent = div.textContent ?? ''
      div.textContent = ''
      div.style.display = 'inline-flex'
      div.style.alignItems = 'center'
      div.style.width = '100%'
      div.style.overflow = 'hidden'
      // Make the .colHeader the offsetParent for the icon/text children.
      // Without position:relative their offsetParent walks past this div
      // to the TH/table, and HOT's manualColumnMove plugin calls
      // offsetRelativeTo() on drag — it crashes with "undefined is not
      // an object (evaluating 'element.offsetLeft')" when the parent
      // chain becomes null before reaching the expected reference node.
      div.style.position = 'relative'
      div.appendChild(icon)
      div.appendChild(textSpan)
    })
    // Checkbox paste fix: convert string "true"/"false" to boolean
    hotRef.current.addHook('beforeChange', (changes: (Handsontable.CellChange | null)[]) => {
      for (const change of changes) {
        if (!change) continue
        const [, prop, , newVal] = change
        if (typeof newVal !== 'string') continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colDef = (COLUMNS as any[]).find(c => c.data === prop)
        if (colDef?.fieldType !== 'checkbox') continue
        const v = newVal.trim().toLowerCase()
        if (['true', '1', 'yes'].includes(v)) change[3] = true
        else if (['false', '0', 'no'].includes(v)) change[3] = false
      }
    })
    // Cell edit → PATCH API + local state sync (shared path for user edits and undo/redo)
    hotRef.current.addHook('afterChange', (changes, source) => {
      if (source === 'loadData' || (source as string) === 'rollback' || !changes) return

      const isUndoRedo = (source as string) === 'undo' || (source as string) === 'redo'
      // Collect all applicable changes from this single afterChange call into one
      // batch entry so multi-cell edits (e.g. drag-select + Delete) undo together.
      const batchItems: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> = []

      // Coalesce per-row updates so multi-cell edits trigger a single setRows + single
      // React re-render instead of one per changed cell.
      const rowUpdates = new Map<number, Record<string, unknown>>()
      const addUpdate = (idx: number, patch: Record<string, unknown>) => {
        const existing = rowUpdates.get(idx)
        rowUpdates.set(idx, existing ? { ...existing, ...patch } : patch)
      }

      for (const [row, prop, oldVal, newVal] of changes) {
        if (oldVal === newVal) continue
        const rowIdx = row as number
        const rowData = rowsRef.current[rowIdx]
        if (!rowData?.id) continue
        if (prop === 'reference_files') continue
        const field = EDITABLE_FIELD_MAP[prop as string]
        if (!field) continue

        if (!isUndoRedo) {
          batchItems.push({ rowId: rowData.id, prop: prop as string, oldVal, newVal })
        }

        // Optimistic local state update. HOT already has the change via setDataAtCell,
        // so skipNextLoadRef avoids the full loadData on the resulting rows effect.
        //
        // Derived columns (e.g. 출고예정일 when 데드라인 changes) are sourced
        // from pageConfig.recomputeDerivedAfterEdit — the page, not DataGrid,
        // knows which fields have computed partners. The returned partial
        // takes precedence: if the page normalized the primary field (e.g.
        // sliced a date to YYYY-MM-DD), that normalized value is what flows
        // into both HOT (via setDataAtCell on the derived columns) and the
        // coalesced rows update.
        const derived = recomputeDerivedAfterEdit
          ? recomputeDerivedAfterEdit(rowsRef.current[rowIdx], field, newVal, {
              holidays: holidaySetRef.current,
            })
          : {}
        for (const [dProp, dVal] of Object.entries(derived)) {
          if (dProp === (prop as string)) continue
          const dCol = propToColRef.current[dProp] ?? -1
          if (dCol >= 0) {
            hotRef.current?.setDataAtCell(rowIdx, dCol, dVal as unknown, 'derived')
          }
        }
        const primaryNormalized = Object.prototype.hasOwnProperty.call(derived, prop as string)
        const primaryValue = primaryNormalized
          ? (derived as Record<string, unknown>)[prop as string]
          : newVal
        addUpdate(rowIdx, { ...derived, [prop as string]: primaryValue })

        // PATCH payload: only when the page normalized the primary (e.g.
        // date slicing for 데드라인) do we translate empty-ish values to
        // null — Postgres rejects '' for date/timestamp columns. Untouched
        // fields pass through raw so text columns can still send ''.
        const patchValue = primaryNormalized && (
          primaryValue === '' ||
          primaryValue == null ||
          (typeof primaryValue === 'string' && primaryValue.trim() === '')
        )
          ? null
          : primaryValue

        // PATCH → rollback on failure
        void (async () => {
          const res = await fetch(`${apiBase}/${rowData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value: patchValue }),
          })
          if (!res.ok) {
            // Rollback HOT cell
            const rollbackCol = propToColRef.current[prop as string] ?? -1
            if (rollbackCol >= 0) {
              hotRef.current?.setDataAtCell(rowIdx, rollbackCol, oldVal, 'rollback')
            }
            // Rollback rows state (HOT already reverted via setDataAtCell — skip full reload).
            // Re-run the derived-field hook on the OLD value so any derived
            // columns (e.g. 출고예정일 when 데드라인 rolls back) revert in
            // lockstep with the primary.
            const rollbackDerived = recomputeDerivedAfterEdit
              ? recomputeDerivedAfterEdit(rowsRef.current[rowIdx], field, oldVal, {
                  holidays: holidaySetRef.current,
                })
              : {}
            for (const [dProp, dVal] of Object.entries(rollbackDerived)) {
              if (dProp === (prop as string)) continue
              const dCol = propToColRef.current[dProp] ?? -1
              if (dCol >= 0) {
                hotRef.current?.setDataAtCell(rowIdx, dCol, dVal as unknown, 'derived')
              }
            }
            const rollbackPrimary = Object.prototype.hasOwnProperty.call(
              rollbackDerived,
              prop as string,
            )
              ? (rollbackDerived as Record<string, unknown>)[prop as string]
              : oldVal
            skipNextLoadRef.current = true
            setRows(prev => prev.map((r, i) =>
              i === rowIdx
                ? { ...r, ...rollbackDerived, [prop as string]: rollbackPrimary }
                : r
            ))
            // Error toast
            showToast({ message: '수정에 실패했습니다', type: 'error' }, 2000)
          }
        })()
      }

      // Single setRows for all coalesced updates — one React commit for the whole batch.
      if (rowUpdates.size > 0) {
        skipNextLoadRef.current = true
        setRows(prev => prev.map((r, i) => {
          const patch = rowUpdates.get(i)
          return patch ? { ...r, ...patch } : r
        }))
      }

      // Commit the collected changes as a single batched undo entry.
      if (batchItems.length > 0) {
        undoStackRef.current.push({ items: batchItems })
        if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift()
        redoStackRef.current = []
      }
    })
    // afterBeginEditing: longtext → textarea 확장, date → 캘린더 자동 오픈, 사출_방식 → 드롭다운 전체 표시
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterBeginEditing', (row: number, col: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (effectiveColumnsRef.current as any[])[col]
      if (!colDef) return

      if (colDef.fieldType === 'longtext') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const editor = hotRef.current?.getActiveEditor() as any
        const textarea = editor?.TEXTAREA
        if (textarea) {
          textarea.style.minHeight = '80px'
          textarea.style.whiteSpace = 'pre-wrap'
          textarea.style.resize = 'vertical'
        }
        return
      }

      if (colDef.type === 'date') {
        setTimeout(() => {
          // 버튼 숨기기 + input 너비 확장 (버튼에 고정 class 없어서 DOM 직접 조작)
          document.querySelectorAll('.htDateInput').forEach(el => {
            const btn = el.querySelector('button')
            if (btn) btn.style.display = 'none'
            const input = el.querySelector('input') as HTMLElement | null
            if (input) input.style.width = '100%'
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const editor = hotRef.current?.getActiveEditor() as any
          // editor 객체에 직접 button 참조가 있으면 숨기기
          if (editor?.datePickerButton) {
            editor.datePickerButton.style.display = 'none'
          }
          // NOTE: `editor.datePicker` is the wrapper DIV, not the Pikaday
          // instance (that's `editor.$datePicker`). Calling `.show()` on
          // the DIV throws "datePicker.show is not a function". The
          // picker is already shown by HOT when the editor opens, so
          // there's nothing to do here.
        }, 30)
      }

    })
    // select 컬럼: 첫 클릭=선택, 두 번째 클릭=드롭다운 오픈
    // beforeOnCellMouseDown에서 클릭 전 선택 상태를 캡처
    let selectAlreadySelected = false
    hotRef.current.addHook('beforeOnCellMouseDown', (e: MouseEvent, coords: { row: number; col: number }) => {
      // Shift+클릭 범위 선택 (No. 컬럼만)
      if (coords.col === 0 && e.shiftKey && rendererBridge.lastCheckedRowRef?.current !== null) {
        const lastCheckedRef = rendererBridge.lastCheckedRowRef
        const checkedRef = rendererBridge.checkedRowsRef
        const setSelected = rendererBridge.setSelectedRowIds
        const hot = rendererBridge.hotRef?.current
        if (!lastCheckedRef || lastCheckedRef.current === null || !hot) return

        const currentRow = coords.row
        const start = Math.min(lastCheckedRef.current, currentRow)
        const end = Math.max(lastCheckedRef.current, currentRow)
        const data = hot.getSourceData() as Row[]

        // 범위 내 모든 행의 id를 checkedRowsRef에 추가
        for (let i = start; i <= end; i++) {
          const id = data[i]?.id
          if (!id) continue
          checkedRef?.current.add(id)

          // viewport에 보이는 셀만 즉시 DOM 업데이트
          const td = hot.getCell(i, 0)
          if (td) {
            const cb = td.querySelector('.row-select-checkbox') as HTMLInputElement
            if (cb) cb.checked = true
          }
        }

        // lastChecked 업데이트
        lastCheckedRef.current = currentRow

        // selectedRowIds state 동기화
        if (checkedRef && setSelected) {
          setSelected(new Set(checkedRef.current))
        }

        return
      }

      // 기존 select 컬럼 로직
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cd = (effectiveColumnsRef.current as any[])[coords.col]
      if (cd?.fieldType !== 'select' || cd?.readOnly) {
        selectAlreadySelected = false
        return
      }
      const sel = hotRef.current?.getSelected()
      selectAlreadySelected = sel?.some(([r1, c1, r2, c2]) =>
        coords.row >= Math.min(r1, r2) && coords.row <= Math.max(r1, r2) &&
        coords.col >= Math.min(c1, c2) && coords.col <= Math.max(c1, c2)
      ) ?? false
    })
    hotRef.current.addHook('afterOnCellMouseDown', (_e: MouseEvent, coords: { row: number; col: number }) => {
      if (coords.row < 0) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colDef = (effectiveColumnsRef.current as any[])[coords.col]
      if (colDef?.fieldType !== 'select' || colDef?.readOnly) return
      if (trashedMode) return // trash view has every cell readOnly
      if (!selectAlreadySelected) return // 첫 클릭: 셀 선택만
      const column = colDef.data as string
      const options = getSelectColumnOptions()[column] ?? []
      const td = hotRef.current?.getCell(coords.row, coords.col) as HTMLElement | null
      if (!td) return
      const rect = td.getBoundingClientRect()
      setSelectMenu({ top: rect.bottom + 4, left: rect.left, row: coords.row, width: Math.max(rect.width, 120), column, options })
    })
    // Row height override — single source of truth for HOT's internal
    // row-height math (viewport, virtualization, scroll). Reads from a ref so
    // updates to the rowHeight state take effect on the next render without
    // needing to re-register the hook.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('modifyRowHeight' as any, (_h: number, _row: number) => rowHeightPxRef.current)

    // Column resize → sync summary bar widths. HOT passes a VISUAL index here,
    // but `colWidths` state is physical-indexed (SummaryBar iterates COLUMNS
    // in its natural/physical order) so we convert before writing. Without
    // this conversion, a resize after a column move would land on the wrong
    // slot in the state array.
    hotRef.current.addHook('afterColumnResize', (newSize: number, column: number) => {
      const pi = hotRef.current?.toPhysicalColumn(column) ?? column
      setColWidths(prev => {
        const next = [...prev]
        next[pi] = newSize
        return next
      })
    })
    // Column move (header drag OR modal drag OR programmatic) → bump version
    // so `managedColumns` recomputes with the current visual order. Also
    // adjust frozenCount: if the moved column crossed the freeze boundary
    // we grow or shrink the frozen region so the "first N visual columns"
    // invariant is preserved.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotRef.current.addHook('afterColumnMove' as any, (
      movedColumns: number[],
      finalIndex: number,
      _dropIndex: number | undefined,
      movePossible: boolean,
      orderChanged: boolean,
    ) => {
      setColumnOrderVersion(v => v + 1)
      if (!movePossible || !orderChanged) return
      if (!movedColumns || movedColumns.length !== 1) return
      const oldIdx = movedColumns[0]
      const newIdx = finalIndex
      const cur = frozenCountRef.current
      const wasFrozen = oldIdx < cur
      const isFrozen = newIdx < cur
      if (wasFrozen && !isFrozen) {
        const n = Math.max(0, cur - 1)
        setFrozenCount(n)
        hotRef.current?.updateSettings({ fixedColumnsStart: n })
      } else if (!wasFrozen && isFrozen) {
        const n = cur + 1
        setFrozenCount(n)
        hotRef.current?.updateSettings({ fixedColumnsStart: n })
      }
    })
    // Freeze is now driven entirely by our contextMenu callbacks →
    // setFrozenCount → the dedicated useEffect that syncs fixedColumnsStart.
    // No hook plumbing required here because we dropped manualColumnFreeze.
    // Selection → update selectedRowIndices for summary bar
    hotRef.current.addHook('afterSelectionEnd', (r1: number, _c1: number, r2: number) => {
      if (r1 < 0) { setSelectedRowIndices(null); return }
      const minR = Math.min(r1, r2)
      const maxR = Math.max(r1, r2)
      if (minR === maxR) { setSelectedRowIndices(null); return }
      const indices: number[] = []
      for (let i = minR; i <= maxR; i++) indices.push(i)
      setSelectedRowIndices(indices)
    })
    hotRef.current.addHook('afterDeselect', () => setSelectedRowIndices(null))
    // Copy: overwrite clipboard with plain TSV + show toast
    hotRef.current.addHook('afterCopy', (data: (string | number | boolean | null)[][]) => {
      const tsv = data
        .map(row => row.map(cell => {
          const val = cell == null ? '' : String(cell)
          return val.includes('\t') || val.includes('\n') ? `"${val}"` : val
        }).join('\t'))
        .join('\n')
      navigator.clipboard.writeText(tsv).catch(() => {})
      showToast({ message: '복사되었습니다', type: 'success' }, 2000)
    })
    // Infinite scroll — load next page when near bottom (90% threshold)
    hotRef.current.addHook('afterScrollVertically', () => {
      const hot = hotRef.current
      if (!hot) return
      const lastVisible = hot.getLastFullyVisibleRow()
      if (lastVisible === null) return
      const total = hot.countRows()
      if (total > 0 && lastVisible >= Math.floor(total * 0.9)) {
        scrollLoadRef.current?.()
      }
    })
    return () => {
      const instance = hotRef.current
      if (instance) {
        instance.destroy()
        // HOT's destroy() nulls `instance.view` along with every other
        // non-function property, but an IntersectionObserver registered
        // by observeVisibilityChangeOnce (when the root's offsetParent
        // was null at init) can still fire AFTER destroy — its callback
        // reaches into `instance.view.*` and throws
        // "null is not an object (evaluating 'instance.view')". Swap in
        // a safe no-op shape so the late callback is a no-op.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).view = {
          _wt: { draw: () => {}, wtOverlays: { updateMainScrollableElements: () => {} } },
          adjustElementsSize: () => {},
        }
      }
      hotRef.current = null
    }
  }, [])

  // ── Personal view settings (per-user persistence) ──────────────────────────
  //
  // Seven settings persist to `user_view_settings` across three jsonb cols:
  //   filters | sort | view{columnOrder, columnWidths, hiddenColumns,
  //                          frozenCount, rowHeight}
  //
  // HOT lifecycle trap we navigate around:
  //   `hot.loadData(rows)` (the rows effect further down) internally calls
  //   `initIndexMappers()` which wipes *every* column plugin's state — the
  //   column-order sequence (manualColumnMove), the widths map
  //   (manualColumnResize), and the hidden-columns map. That means applying
  //   the view before the first fetch lands is useless — loadData erases it
  //   seconds later. It also means every infinite-scroll append resets the
  //   view unless we re-apply it.
  //
  // Design:
  //   - Mount restore: load all 3 blobs, mirror into React state + a
  //     `savedViewRef`, trigger the data fetch. Do NOT touch HOT plugins here.
  //   - A dedicated effect declared AFTER the loadData effect (same commit,
  //     later declaration → runs later per React effect ordering rules)
  //     re-applies the view to HOT plugins every time `rows` changes. That
  //     catches initial load and every append.
  //   - Save effect eagerly refreshes `savedViewRef` so subsequent re-applies
  //     use the up-to-the-millisecond view, then debounces the server write.
  const restoredRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedViewRef = useRef<PersistedView | null>(null)

  // HOT's current physical-column schema. Defaults to COLUMNS (original
  // definition order); swapped to a reordered array when a saved
  // columnOrder is restored (see restore effect below). Every runtime
  // lookup that asks "which column definition is at HOT physical index
  // X?" MUST go through this ref — after a declarative reorder, COLUMNS
  // no longer matches HOT's physical order.
  //
  // `propToColRef` is the inverse: prop name → physical index in the
  // current effectiveColumns. It replaces direct `PROP_TO_COL[prop]`
  // reads in runtime paths (handlers, effects). We keep the module-scope
  // `PROP_TO_COL` const as the initial seed value.
  const effectiveColumnsRef = useRef<typeof COLUMNS>(COLUMNS)
  const propToColRef = useRef<Record<string, number>>(PROP_TO_COL)

  // Single source of truth for "what does the grid currently show?".
  // Called by the save effect (debounced server write), the registry
  // getSnapshot (LNB "+ 새 뷰"), and the registry flush (unmount / tab
  // close). Reads live state imperatively from HOT plugins + refs —
  // never from React state or a stored snapshot ref — so the answer
  // is always true at call time regardless of where in the commit
  // cycle we are.
  //
  // Data source rationale:
  //   columnOrder  ← hot.toPhysicalColumn(vi) for vi=1..N.
  //                  toPhysicalColumn already reflects runtime header
  //                  drags (manualColumnMove) AND declarative reorders
  //                  from updateSettings({columns}). No separate state
  //                  to sync.
  //   columnWidths ← colWidthsRef (React-state mirror). afterColumnResize
  //                  writes this with the user's manual size. We do NOT
  //                  use hot.getColWidth(vi) because it returns 0 for
  //                  hidden columns and can reflect stretch-to-fit,
  //                  neither of which represents the user's intent.
  //   hiddenColumns← hiddenColumnsRef.current (Set<prop>). React state is
  //                  authoritative, not the HOT plugin: the plugin is
  //                  driven by a separate effect that runs AFTER the save
  //                  effect in declaration order. Reading the plugin here
  //                  would return pre-sync state and persist [] for the
  //                  very edit that triggered the save. The ref mirror is
  //                  updated by an earlier effect (line ~395), so by the
  //                  time the save effect runs it already reflects the
  //                  new set.
  //   frozenCount  ← hot.getSettings().fixedColumnsStart. Our freeze
  //                  controls flow through setFrozenCount → effect →
  //                  updateSettings({fixedColumnsStart}), so HOT is the
  //                  authoritative holder.
  //   rowHeight    ← rowHeightRef (React-state mirror).
  //   filters/sort ← filterStateRef / sortConditionsRef (React-state
  //                  mirrors). These are UI-only state with no HOT
  //                  counterpart.
  const computeLiveSnapshot = useCallback((): {
    filters: RootFilterState
    sort: SortCondition[]
    view: PersistedView
  } => {
    const hot = hotRef.current
    const columnOrder: string[] = []
    const columnWidths: Record<string, number> = {}
    const hiddenProps: string[] = []
    let frozenNow = frozenCountRef.current

    if (hot) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = (effectiveColumnsRef.current as any[]).length

      // Hidden columns — read from React-state mirror (Set<prop>). See
      // comment above for why we don't query the HOT plugin here.
      const hiddenPropSet = hiddenColumnsRef.current

      // Walk HOT's visual order. vi=0 is the pinned No. column — skip.
      // hiddenColumns in HOT 14 uses a hidingMap (not a trimmingMap),
      // so hidden columns still occupy visual indices. Iterating up to
      // total (physical count) therefore includes both visible and
      // hidden slots.
      for (let vi = 1; vi < total; vi++) {
        const pi = hot.toPhysicalColumn(vi)
        if (typeof pi !== 'number' || pi < 0) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (effectiveColumnsRef.current as any[])[pi]
        if (!c || typeof c.data !== 'string' || !c.data) continue

        columnOrder.push(c.data)

        // Width: colWidthsRef (user's manual intent). Fall back to the
        // column definition's default so we always record something.
        const stateW = colWidthsRef.current[pi]
        if (typeof stateW === 'number' && stateW > 0) {
          columnWidths[c.data] = stateW
        } else if (typeof c.width === 'number' && c.width > 0) {
          columnWidths[c.data] = c.width
        }

        if (hiddenPropSet.has(c.data)) hiddenProps.push(c.data)
      }

      const fcs = hot.getSettings().fixedColumnsStart
      if (typeof fcs === 'number' && fcs >= 0) frozenNow = fcs
    }

    const view: PersistedView = {
      columnOrder,
      columnWidths,
      hiddenColumns: hiddenProps,
      frozenCount: frozenNow,
      rowHeight: rowHeightRef.current,
    }
    return {
      filters: filterStateRef.current,
      sort: sortConditionsRef.current,
      view,
    }
  }, [])

  // Pure-ish helper: takes a settings blob (from loadSettings on mount OR
  // from applyPreset's runtime hand-off) and applies it to React state +
  // HOT's declarative settings (columns / colWidths / fixedColumnsStart
  // are handled by HOT via updateSettings; manualColumnResize widths are
  // re-attached by the post-loadData effect after rows change).
  //
  // Called from the mount-restore effect (with settings loaded from
  // loadSettings) and from the registry's applyRuntime path (with the
  // preset's settings passed in by applyPreset). Both paths end by
  // calling handleLoad so rows re-fetch and the post-loadData effect
  // runs against the freshly-stashed savedViewRef.
  const applyFromSettings = useCallback((settings: PersistedSettings | null) => {
    // Stash view in ref so the post-loadData effect can re-apply it
    // every time `rows` changes (first fetch + infinite scroll).
    savedViewRef.current = settings?.view ?? null

    // filters + sort → state, UNCONDITIONALLY. A preset with no filters
    // must clear the current filter state, not inherit the previous one.
    if (settings?.filters && typeof settings.filters === 'object') {
      setFilterState(settings.filters as RootFilterState)
    } else {
      setFilterState({ logic: 'AND', conditions: [] })
    }
    if (Array.isArray(settings?.sort)) {
      setSortConditions(settings.sort as SortCondition[])
    } else {
      setSortConditions([])
    }

    if (settings?.view) {
      const view = settings.view

      // ── Declarative column order ─────────────────────────────────
      // If a saved columnOrder is present, reorder the columns array
      // here and push it into HOT via updateSettings({ columns }).
      // This makes HOT's *physical* column order equal to the user's
      // saved visual order from the start, so index mappers stay at
      // identity and no imperative moveColumn/setIndexesSequence is
      // needed. Columns not in the saved order (e.g. a schema column
      // added since last save) get appended at the end so their data
      // is still visible.
      //
      // Must run BEFORE setColWidths + HOT.updateSettings(colWidths)
      // so the widths array we compute is indexed by the *new*
      // physical order.
      const hot = hotRef.current
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let effectiveColumns: any[] = COLUMNS as any[]
      if (hot && Array.isArray(view.columnOrder) && view.columnOrder.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordered: any[] = [(COLUMNS as any[])[0]] // pin No. col at physical/visual 0
        const seen = new Set<string>()
        for (const prop of view.columnOrder) {
          if (typeof prop !== 'string' || seen.has(prop)) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = (COLUMNS as any[]).find((x: any) => x?.data === prop)
          if (c) { ordered.push(c); seen.add(prop) }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (let i = 1; i < (COLUMNS as any[]).length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = (COLUMNS as any[])[i]
          if (typeof c?.data === 'string' && c.data && !seen.has(c.data)) {
            ordered.push(c); seen.add(c.data)
          }
        }
        effectiveColumns = ordered
      }

      // Widths indexed by effectiveColumns physical order.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const widthsArr = (effectiveColumns as any[]).map((c: any) => {
        if (typeof c?.data === 'string' && c.data) {
          const w = view.columnWidths[c.data]
          if (typeof w === 'number' && w > 0) return w
        }
        return c?.width ?? 100
      })

      // Push reordered schema + widths into HOT in one call. HOT's
      // index mappers end up at identity (visual == physical), which
      // is exactly what we want — runtime drags go through
      // manualColumnMove as usual and don't need to worry about a
      // pre-existing non-identity mapping.
      if (hot) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effectiveColumnsRef.current = effectiveColumns as typeof COLUMNS
        const nextPropToCol: Record<string, number> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(effectiveColumns as any[]).forEach((c: any, i: number) => {
          if (typeof c?.data === 'string' && c.data) nextPropToCol[c.data] = i
        })
        propToColRef.current = nextPropToCol
        hot.updateSettings({ columns: effectiveColumns, colWidths: widthsArr })
      }

      setColWidths(widthsArr)
      setHiddenColumns(new Set(view.hiddenColumns))
      setFrozenCount(view.frozenCount)
      setRowHeight(view.rowHeight)
      // Nudge managedColumns / dependent memos that key off column order.
      setColumnOrderVersion(v => v + 1)
    } else {
      // No view in settings (e.g. preset with null view): reset to
      // defaults so stale widths/hidden/freeze from a prior preset
      // don't persist.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaultWidths = (COLUMNS as any[]).map((c: any) => c.width ?? 100)
      const hot = hotRef.current
      if (hot) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effectiveColumnsRef.current = COLUMNS as typeof COLUMNS
        propToColRef.current = PROP_TO_COL
        hot.updateSettings({ columns: COLUMNS, colWidths: defaultWidths })
      }
      setColWidths(defaultWidths)
      setHiddenColumns(new Set())
      setFrozenCount(0)
      setRowHeight('short')
      setColumnOrderVersion(v => v + 1)
    }
  }, [COLUMNS, PROP_TO_COL])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // loadEffectiveSettings picks the right source: the active preset's
      // row (when one is marked active in localStorage) or the shared
      // default row otherwise. It also seeds the in-session cache so a
      // subsequent mount in this tab short-circuits the fetch.
      const { settings, activePresetId: activeIdAtMount } =
        await loadEffectiveSettings(VIEW_PAGE_KEY)
      if (cancelled) return

      // Keep the ref in sync even before PresetsContext rehydrates from
      // localStorage — otherwise a pre-hydration save would go to the
      // default row instead of the active preset's row.
      activePresetIdRef.current = activeIdAtMount

      applyFromSettings(settings)

      // Trigger the data fetch. The post-loadData effect will apply view
      // to HOT plugins once rows arrive.
      handleLoad()

      // Unblock saves on the next macrotask — the batched restore commit
      // runs the save effect with restoredRef=false and no-ops.
      setTimeout(() => { restoredRef.current = true }, 0)
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save (1s). Snapshots the view into `savedViewRef` immediately
  // so that any rows change between now and the timer firing still gets the
  // up-to-date view re-applied by the post-loadData effect. The server write
  // is what gets debounced.
  useEffect(() => {
    if (!restoredRef.current) return

    // Build from live HOT state via computeLiveSnapshot rather than the
    // deps' captured values. This keeps savedViewRef authoritative even
    // when afterColumnResize fires mid-commit and the dependency-value
    // closure is one tick behind. getSnapshot / flush read the same
    // source, so there's no second mirror to maintain.
    const snap = computeLiveSnapshot()
    savedViewRef.current = snap.view

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      // Routes to either PATCH /api/user-view-presets/<id> (active
      // preset) or POST /api/user-view-settings (default row). Reads
      // activePresetIdRef at flush time so a preset switch that happens
      // during the 400ms debounce window goes to the right destination.
      persistViewPatch(VIEW_PAGE_KEY, activePresetIdRef.current, {
        filters: snap.filters,
        sort: snap.sort,
        view: snap.view,
      })
    }, 400)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [rowHeight, hiddenColumns, frozenCount, colWidths, columnOrderVersion, filterState, sortConditions, VIEW_PAGE_KEY])

  // Register a window-level snapshot hook so the LNB ("+ 새 뷰") can read
  // the live view state synchronously, and a beforeunload flush so a
  // pending debounced save isn't lost when the user closes the tab.
  //
  // The registry is keyed by VIEW_PAGE_KEY so /works/production and
  // /works/trash can each own their own entry. Each grid instance keeps
  // its own entry live only for the duration of its mount.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const registry: Record<string, {
      getSnapshot: () => { filters: unknown; sort: unknown; view: PersistedView | null }
      // Returns a promise so applyPreset can await the outgoing preset's
      // DB write before fetching the incoming preset's fresh state.
      // Resolves immediately when there's nothing pending.
      flush: () => Promise<void>
      cancelPending: () => void
      applyRuntime: (settings: PersistedSettings | null) => void
    }> = w.__worksGrid ?? (w.__worksGrid = {})
    const entry = {
      // Read live state at click-time by imperatively querying HOT
      // (column order, hidden, frozen) + the ref mirrors (widths,
      // rowHeight, filter/sort). The save effect is gated by
      // restoredRef, so on first mount and right after applyRuntime a
      // cached snapshot would be stale/default — that was the bug
      // making every "+ 새 뷰" preset save with identical widths/order
      // that didn't match the on-screen grid.
      getSnapshot: () => computeLiveSnapshot(),
      flush: () => {
        // No-op when nothing is pending. Prevents applyPreset's awaited
        // flush from adding an unnecessary network round-trip on every
        // preset switch (the common case — the user wasn't mid-edit).
        if (!saveTimerRef.current) return Promise.resolve()
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        // Also read live — a flush fired from unmount/beforeunload must
        // persist the true current state. Routes to the active preset's
        // row or the default row based on activePresetIdRef at call
        // time, same as the debounced path.
        const snap = computeLiveSnapshot()
        return persistViewPatch(VIEW_PAGE_KEY, activePresetIdRef.current, {
          filters: snap.filters,
          sort: snap.sort,
          view: snap.view,
        })
      },
      // applyPreset calls this before navigating so a pending debounced
      // save (e.g. a resize made just before clicking the preset)
      // doesn't fire via keepalive after applyPreset's POST and clobber
      // the preset on the server.
      cancelPending: () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
      },
      // Imperative same-page preset apply. When applyPreset lands on a
      // grid that's already mounted for its pageKey, calling this skips
      // the remount dance: restoredRef blocks the save effect, settings
      // are applied to React state + HOT via applyFromSettings, rows
      // re-fetch via handleLoad, and then the post-loadData effect
      // reattaches manualColumnResize widths. This avoids the failure
      // mode where bumpRemountVersion didn't actually tear down the
      // grid (e.g. because useSyncExternalStore skipped the notify) and
      // preset.view.columnWidths never reached HOT.
      applyRuntime: (settings: PersistedSettings | null) => {
        // Block the save effect while we mutate the view-related state
        // in one commit — otherwise it would flush those transient
        // setState calls back to the server before they settle.
        restoredRef.current = false
        // Also drop any debounced save that was scheduled just before
        // the preset click (belt-and-braces with applyPreset's own
        // cancelPending call).
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
        applyFromSettings(settings)
        handleLoad()
        setTimeout(() => { restoredRef.current = true }, 0)
      },
    }
    registry[VIEW_PAGE_KEY] = entry

    const onBeforeUnload = () => {
      // flush() internally checks saveTimerRef and no-ops if nothing
      // is pending. Let it own the clearing so the short-circuit path
      // (applyPreset's awaited flush) and this path both go through
      // the same logic.
      void entry.flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      // Flush any pending debounced save so SPA navigation away from this
      // grid (e.g. clicking the 휴지통 link) doesn't drop the last resize
      // or column-move. beforeunload only fires on hard reload/close, not
      // on Next.js soft nav — if the user resizes and navigates within the
      // 400ms debounce window, the write would otherwise be lost and the
      // next mount would restore stale widths.
      void entry.flush()
      if (registry[VIEW_PAGE_KEY] === entry) delete registry[VIEW_PAGE_KEY]
    }
  }, [VIEW_PAGE_KEY])

  // Row height change → update CSS var, ref (drives modifyRowHeight hook),
  // and force HOT to recompute viewport dimensions.
  // updateSettings({ rowHeights }) alone doesn't bust Walkontable's measured
  // row-height cache, which causes stale scroll math and clipped rows.
  // modifyRowHeight (registered at init) is the authoritative override; we
  // just need to update the ref + refreshDimensions + render.
  useEffect(() => {
    const px = ROW_HEIGHT_PX[rowHeight]
    const thumbPx = ROW_THUMB_PX[rowHeight]
    rowHeightPxRef.current = px
    rendererBridge.imageThumbUrlWidth = ROW_THUMB_URL_W[rowHeight]
    document.documentElement.style.setProperty('--grid-row-h', `${px}px`)
    document.documentElement.style.setProperty('--grid-thumb-size', `${thumbPx}px`)
    const hot = hotRef.current
    if (!hot) return
    hot.refreshDimensions()
    // render() re-invokes every cell renderer, so image cells fetch the new
    // Supabase ?width= URL for the updated thumb size.
    hot.render()
  }, [rowHeight])

  // Frozen count → HOT fixedColumnsStart. Single source of truth for the
  // "freeze from column 1 to N" behavior. Keep the ref in lockstep so the
  // contextMenu callbacks (which closed over values at init time) see the
  // current count in their disabled()/callback() lookups.
  useEffect(() => {
    frozenCountRef.current = frozenCount
    const hot = hotRef.current
    if (!hot) return
    const current = (hot.getSettings().fixedColumnsStart as number) ?? 0
    if (current !== frozenCount) {
      hot.updateSettings({ fixedColumnsStart: frozenCount })
    }
  }, [frozenCount])

  // Hidden columns change → sync with HOT's HiddenColumns plugin.
  // Diff-style: show everything currently hidden, then hide the target set.
  //
  // hideColumns/showColumns take *visual* indices (HOT source:
  // plugins/hiddenColumns/hiddenColumns.js:304, .318). PROP_TO_COL yields a
  // physical index, so we must convert via toVisualColumn — otherwise after
  // any manualColumnMove reorder the wrong columns get hidden.
  useEffect(() => {
    const hot = hotRef.current
    if (!hot) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = hot.getPlugin('hiddenColumns') as any
    if (!plugin) return
    const prevHidden: number[] = plugin.getHiddenColumns?.() ?? []
    if (prevHidden.length > 0) plugin.showColumns(prevHidden)
    const targetVisual: number[] = []
    hiddenColumns.forEach(prop => {
      const pi = propToColRef.current[prop]
      if (typeof pi === 'number') {
        const vi = hot.toVisualColumn(pi)
        if (vi >= 0) targetVisual.push(vi)
      }
    })
    if (targetVisual.length > 0) plugin.hideColumns(targetVisual)
    hot.render()
  }, [hiddenColumns])

  // Close toolbar dropdowns on outside click.
  useEffect(() => {
    if (!showColumnManager && !showRowHeightMenu && !showExportMenu) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (showColumnManager && !columnManagerRef.current?.contains(t)) setShowColumnManager(false)
      if (showRowHeightMenu && !rowHeightMenuRef.current?.contains(t)) setShowRowHeightMenu(false)
      if (showExportMenu && !exportMenuRef.current?.contains(t)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnManager, showRowHeightMenu, showExportMenu])

  // Cmd/Ctrl+Enter inside the filter modal → apply filter.
  // Kept in its own effect so it rebinds when showFilterModal flips without disturbing the undo listener.
  useEffect(() => {
    if (!showFilterModal) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleLoad()
        setShowFilterModal(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFilterModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Column hide toggle (by data prop key).
  const handleToggleHidden = useCallback((prop: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      if (next.has(prop)) next.delete(prop)
      else next.add(prop)
      return next
    })
  }, [])

  // Show all columns.
  const handleShowAll = useCallback(() => {
    setHiddenColumns(new Set())
  }, [])

  // Hide all columns (except the No. column, which is never in managedColumns).
  const handleHideAll = useCallback(() => {
    const all = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(COLUMNS as any[]).forEach((c: any, i: number) => {
      if (i > 0 && typeof c.data === 'string' && c.data) all.add(c.data)
    })
    setHiddenColumns(all)
  }, [])

  // Drag reorder from the column manager modal. Uses HOT's manualColumnMove
  // plugin. moveColumn(from, to) moves the column at visual index `from` so
  // it lands at visual index `to` in the final order. afterColumnMove hook
  // bumps columnOrderVersion → managedColumns recomputes.
  const handleReorderColumn = useCallback((fromProp: string, toProp: string) => {
    const hot = hotRef.current
    if (!hot) return
    const fromPi = propToColRef.current[fromProp]
    const toPi = propToColRef.current[toProp]
    if (typeof fromPi !== 'number' || typeof toPi !== 'number') return
    const fromVi = hot.toVisualColumn(fromPi)
    const toVi = hot.toVisualColumn(toPi)
    if (fromVi < 0 || toVi < 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = hot.getPlugin('manualColumnMove') as any
    if (!plugin) return
    plugin.moveColumn(fromVi, toVi)
    hot.render()
  }, [])

  // Reset view — restores column widths, unhides everything, unfreezes everything,
  // and returns rowHeight to Short. Does NOT reset column order (Phase 2).
  const handleResetView = useCallback(() => {
    const hot = hotRef.current
    if (!hot) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hiddenPlugin = hot.getPlugin('hiddenColumns') as any
    const prevHidden: number[] = hiddenPlugin?.getHiddenColumns?.() ?? []
    if (prevHidden.length > 0) hiddenPlugin.showColumns(prevHidden)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultWidths = (effectiveColumnsRef.current as any[]).map((c: any) => c.width ?? 100)
    hot.updateSettings({ colWidths: defaultWidths, fixedColumnsStart: 0 })
    setColWidths(defaultWidths)

    setHiddenColumns(new Set())
    setFrozenCount(0)
    setRowHeight('short')
    setShowColumnManager(false)
    hot.render()
  }, [])

  // CSV export. Skips the No. column, any currently-hidden columns, and image/attachment
  // columns (binary). Checkbox values become 예/아니오. UTF-8 BOM prepended so Excel
  // opens Korean text correctly.
  const handleExportCSV = useCallback((onlySelected: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportCols = (COLUMNS as any[]).filter((c: any, i: number) => {
      if (i === 0) return false
      if (typeof c.data !== 'string' || !c.data) return false
      if (c.fieldType === 'image' || c.fieldType === 'attachment') return false
      if (hiddenColumns.has(c.data)) return false
      return true
    })

    const source = onlySelected
      ? rowsRef.current.filter(r => selectedRowIds.has(r.id))
      : rowsRef.current

    if (source.length === 0) {
      showToast({ message: '내보낼 데이터가 없습니다', type: 'error' }, 2000)
      return
    }

    const escape = (v: unknown): string => {
      if (v == null) return ''
      if (typeof v === 'boolean') return v ? '예' : '아니오'
      const s = String(v)
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const readPath = (row: Row, path: string): unknown => {
      let val: unknown = row
      for (const part of path.split('.')) {
        if (val == null || typeof val !== 'object') return undefined
        val = (val as Record<string, unknown>)[part]
      }
      return val
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const header = exportCols.map((c: any) => escape(c.title)).join(',')
    const body = source.map(row =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exportCols.map((c: any) => escape(readPath(row, c.data))).join(','),
    ).join('\n')
    const csv = '\uFEFF' + header + '\n' + body

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `works_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }, [hiddenColumns, selectedRowIds, showToast])

  // Manageable columns (for the column manager dropdown) — in HOT's current
  // visual order (so reorders from either the header drag or the modal drag
  // are reflected). Excludes the No. column. Depends on columnOrderVersion so
  // reorders trigger recomputation.
  const managedColumns: ManagedColumn[] = useMemo(() => {
    const hot = hotRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (effectiveColumnsRef.current as any[]).length
    const result: ManagedColumn[] = []
    for (let vi = 1; vi < total; vi++) {
      const pi = hot ? hot.toPhysicalColumn(vi) : vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (effectiveColumnsRef.current as any[])[pi]
      if (c && typeof c.data === 'string' && c.data && typeof c.title === 'string') {
        result.push({ data: c.data, title: c.title })
      }
    }
    return result
  }, [columnOrderVersion])

  // Update grid data
  useEffect(() => {
    if (!hotRef.current) return
    if (skipNextLoadRef.current) {
      // Cell-edit path: HOT already applied the change via setDataAtCell.
      // Skip the expensive full reload and dimension refresh.
      skipNextLoadRef.current = false
      return
    }
    hotRef.current.loadData(rows)
    if (rows.length > 0) hotRef.current.refreshDimensions()
  }, [rows])

  // Post-loadData view re-apply. Must be declared AFTER the loadData effect
  // above so React runs it later in the same commit — that's the point where
  // HOT's column plugins have just been reset to identity by initIndexMappers
  // and we can cleanly re-attach widths / hidden / freeze.
  //
  // Order is NOT re-applied here: it's declarative, set once in the mount
  // restore effect via updateSettings({ columns }). loadData doesn't touch
  // the columns array, so the physical order persists across reloads and
  // appends without any imperative work.
  //
  // Applied every time `rows` changes (initial load, filter/sort reload,
  // infinite scroll append) because each of those paths hits loadData. Cheap
  // on large datasets — the work is O(columns).
  useEffect(() => {
    const hot = hotRef.current
    if (!hot) return
    const view = savedViewRef.current
    if (!view) return

    // 1) Widths — iterate HOT's current physical column schema
    //    (effectiveColumnsRef) so setManualSize receives the right index.
    //    With the declarative order in place, visual == physical, so passing
    //    physical to setManualSize (which treats its arg as visual and
    //    converts internally) is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mcr = hot.getPlugin('manualColumnResize') as any
    if (mcr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(effectiveColumnsRef.current as any[]).forEach((c: any, pi: number) => {
        if (pi === 0) return
        const savedW = typeof c?.data === 'string' && c.data
          ? view.columnWidths[c.data]
          : undefined
        if (typeof savedW === 'number' && savedW > 0) {
          mcr.setManualSize(pi, savedW)
        }
      })
    }

    // 2) Hidden columns. hideColumns takes *visual* indices
    //    (handsontable/plugins/hiddenColumns/hiddenColumns.js:304, .318).
    //    propToColRef gives HOT physical, toVisualColumn converts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hiddenPlugin = hot.getPlugin('hiddenColumns') as any
    if (hiddenPlugin) {
      const prevHidden: number[] = hiddenPlugin.getHiddenColumns?.() ?? []
      if (prevHidden.length > 0) hiddenPlugin.showColumns(prevHidden)
      const targetVisual: number[] = []
      for (const prop of view.hiddenColumns) {
        const pi = propToColRef.current[prop]
        if (typeof pi === 'number') {
          const vi = hot.toVisualColumn(pi)
          if (vi >= 0) targetVisual.push(vi)
        }
      }
      if (targetVisual.length > 0) hiddenPlugin.hideColumns(targetVisual)
    }

    // 4) Freeze.
    const currentFrozen = (hot.getSettings().fixedColumnsStart as number) ?? 0
    if (currentFrozen !== view.frozenCount) {
      hot.updateSettings({ fixedColumnsStart: view.frozenCount })
    }

    hot.render()
  }, [rows])

  // Custom Cmd+Z / Cmd+Shift+Z undo/redo.
  // Drives the same afterChange PATCH pipeline via setDataAtCell with a custom source,
  // so DB sync and rollback behavior are unified with normal edits.
  useEffect(() => {
    const replay = (
      fromStack: React.MutableRefObject<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>,
      toStack: React.MutableRefObject<Array<{ items: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> }>>,
      pickValue: (item: { oldVal: unknown; newVal: unknown }) => unknown,
      hotSource: 'undo' | 'redo',
    ) => {
      const hot = hotRef.current
      if (!hot) return
      // Pop entries until one has at least one item whose row is still in the
      // current view (items for soft-deleted/unloaded rows are dropped).
      while (fromStack.current.length > 0) {
        const entry = fromStack.current.pop()!
        const tuples: Array<[number, number, unknown]> = []
        const validItems: Array<{ rowId: string; prop: string; oldVal: unknown; newVal: unknown }> = []
        for (const item of entry.items) {
          const rowIdx = rowsRef.current.findIndex(r => r.id === item.rowId)
          if (rowIdx === -1) continue
          const col = propToColRef.current[item.prop] ?? -1
          if (col < 0) continue
          tuples.push([rowIdx, col, pickValue(item)])
          validItems.push(item)
        }
        if (tuples.length === 0) continue
        // Array form → single afterChange with all changes, keeps batch semantics.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hot.setDataAtCell(tuples as any, hotSource)
        toStack.current.push({ items: validItems })
        if (toStack.current.length > UNDO_LIMIT) toStack.current.shift()
        return
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || e.key.toLowerCase() !== 'z') return
      // Let the native browser undo handle text editing inside an open HOT editor.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = hotRef.current?.getActiveEditor() as any
      if (editor?.isOpened?.()) return
      e.preventDefault()
      if (e.shiftKey) {
        replay(redoStackRef, undoStackRef, entry => entry.newVal, 'redo')
      } else {
        replay(undoStackRef, redoStackRef, entry => entry.oldVal, 'undo')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Realtime subscription — sync editable fields from other clients. The
  // per-row merge is delegated to pageConfig.mergeRealtimeUpdate because the
  // set of synced fields (and any derived recomputation) is page-specific.
  useEffect(() => {
    const channel = supabase
      .channel(realtimeChannel)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: realtimeTable },
        (payload) => {
          const n = payload.new as Record<string, unknown>
          const updatedId = n.id as string
          setRows(prev => prev.map(row => {
            if (row.id !== updatedId) return row
            return mergeRealtimeUpdate(row, n, { holidays: holidaySetRef.current })
          }))
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [realtimeChannel, realtimeTable, mergeRealtimeUpdate])

  // First-editable-column index. The optimistic "+ 추가" row is empty —
  // auto-focusing the first cell the user can actually edit avoids an
  // extra click before they can start filling it out. Computed from the
  // page's column catalog so it stays correct as columns are reordered
  // or new pages add add-row support.
  const firstEditableColIdx = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols = COLUMNS as any[]
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]
      if (!c || c.readOnly) continue
      if (typeof c.data !== 'string') continue
      if (!EDITABLE_FIELD_MAP[c.data]) continue
      if (c.editor === false) continue // checkbox-only cells don't open an editor
      return i
    }
    return -1
  }, [COLUMNS, EDITABLE_FIELD_MAP])

  // Add-row flow: POST bare row → get id → prepend optimistic placeholder →
  // scroll + focus so the user can start editing. Subsequent edits flow
  // through the normal afterChange PATCH pipeline; the placeholder stays
  // pinned at the top until the derived row materializes server-side (at
  // which point the fetch-replace dedupe removes it from the optimistic
  // set and keeps only the server copy).
  const handleAddRow = useCallback(async () => {
    if (!addRowEnabled || !addRow) return
    if (addingRowRef.current) return
    addingRowRef.current = true
    try {
      const res = await fetch(`${apiBase}/create`, { method: 'POST' })
      if (!res.ok) {
        showToast({ message: '행 추가에 실패했습니다', type: 'error' }, 3000)
        return
      }
      const body = (await res.json()) as { id?: string }
      const id = body?.id
      if (!id) {
        showToast({ message: '행 추가에 실패했습니다', type: 'error' }, 3000)
        return
      }
      const placeholder = addRow.createEmptyRow(id)
      optimisticRowIdsRef.current.add(id)
      setRows(prev => [placeholder, ...prev])
      dataLoaded.current = true
      // After HOT consumes the new row via loadData (rows effect),
      // scroll the top into view and drop focus on the first editable cell.
      // One macrotask is enough — loadData runs synchronously in that effect.
      setTimeout(() => {
        const hot = hotRef.current
        if (!hot) return
        try {
          hot.scrollViewportTo({ row: 0, col: 0, verticalSnap: 'top' })
        } catch {
          // older HOT signature fallback
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(hot as any).scrollViewportTo(0, 0)
        }
        const col = firstEditableColIdx >= 0 ? firstEditableColIdx : 0
        hot.selectCell(0, col)
      }, 0)
    } catch {
      showToast({ message: '행 추가에 실패했습니다', type: 'error' }, 3000)
    } finally {
      addingRowRef.current = false
    }
  }, [addRow, addRowEnabled, apiBase, firstEditableColIdx, showToast])

  // Shift+Enter anywhere outside an open editor / input triggers add-row.
  useEffect(() => {
    if (!addRowEnabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !e.shiftKey) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (target.isContentEditable) return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editor = hotRef.current?.getActiveEditor() as any
      if (editor?.isOpened?.()) return
      e.preventDefault()
      void handleAddRow()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addRowEnabled, handleAddRow])

  // Handle row deletion
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedRowIds)
    if (ids.length === 0) return

    try {
      const res = await fetch(`${apiBase}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        showToast({ message: '삭제에 실패했습니다', type: 'error' }, 3000)
        return
      }

      // Remove deleted rows from UI
      setRows(prev => prev.filter(r => !ids.includes(r.id)))
      // Optimistic-row bookkeeping: if any of the deleted ids were still
      // optimistic (never materialized in flat_order_details), drop them
      // from the pinned-ids set so a subsequent fetch-replace doesn't
      // resurrect them from rowsRef.
      for (const id of ids) optimisticRowIdsRef.current.delete(id)

      // Clear selection
      checkedRowsRef.current.clear()
      setSelectedRowIds(new Set())
      lastCheckedRowRef.current = null

      // Show toast with undo action
      showToast({
        message: `${ids.length}개 삭제됨`,
        type: 'success',
        undoAction: async () => {
          try {
            const restoreRes = await fetch(`${apiBase}/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            })

            if (!restoreRes.ok) {
              showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
              return
            }

            // Reload data to restore rows
            setOffset(0)
            setFetchTrigger(prev => prev + 1)
            showToast({ message: `${ids.length}개 복구됨`, type: 'success' }, 2000)
          } catch {
            showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
          }
        },
      }, 5000)
    } catch {
      showToast({ message: '삭제에 실패했습니다', type: 'error' }, 3000)
    }
  }

  const handleClearSelection = () => {
    checkedRowsRef.current.clear()
    setSelectedRowIds(new Set())
    lastCheckedRowRef.current = null
    hotRef.current?.render()
  }

  // Trash-only: restore the selection (flip deleted_at → null). The
  // restored rows leave the trash view immediately (they no longer
  // match trashed_only), so we drop them from local state rather than
  // refetching for snappy feedback. Undo revives by re-soft-deleting.
  const handleRestoreSelected = async () => {
    const ids = Array.from(selectedRowIds)
    if (ids.length === 0) return
    try {
      const res = await fetch(`${apiBase}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
        return
      }
      setRows(prev => prev.filter(r => !ids.includes(r.id)))
      checkedRowsRef.current.clear()
      setSelectedRowIds(new Set())
      lastCheckedRowRef.current = null
      showToast({
        message: `${ids.length}개 복구됨`,
        type: 'success',
        undoAction: async () => {
          try {
            const redeleteRes = await fetch(`${apiBase}/bulk-delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            })
            if (!redeleteRes.ok) {
              showToast({ message: '되돌리기에 실패했습니다', type: 'error' }, 3000)
              return
            }
            setOffset(0)
            setFetchTrigger(prev => prev + 1)
            showToast({ message: '복구를 취소했습니다', type: 'success' }, 2000)
          } catch {
            showToast({ message: '되돌리기에 실패했습니다', type: 'error' }, 3000)
          }
        },
      }, 5000)
    } catch {
      showToast({ message: '복구에 실패했습니다', type: 'error' }, 3000)
    }
  }

  // Trash-only: irreversible DELETE FROM order_items. Confirmed via
  // window.confirm — no undo path because the data is gone at the DB
  // level (flat_order_details row also disappears via cascade).
  const handlePermanentDeleteSelected = async () => {
    const ids = Array.from(selectedRowIds)
    if (ids.length === 0) return
    const ok = window.confirm(`${ids.length}개 행을 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`)
    if (!ok) return
    try {
      const res = await fetch(`${apiBase}/permanent-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        showToast({ message: '영구삭제에 실패했습니다', type: 'error' }, 3000)
        return
      }
      setRows(prev => prev.filter(r => !ids.includes(r.id)))
      checkedRowsRef.current.clear()
      setSelectedRowIds(new Set())
      lastCheckedRowRef.current = null
      showToast({ message: `${ids.length}개 영구 삭제됨`, type: 'success' }, 3000)
    } catch {
      showToast({ message: '영구삭제에 실패했습니다', type: 'error' }, 3000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: (좌) 필터 / 검색 / 정렬  (우) count */}
      <div className="flex-shrink-0 flex items-center gap-2 border-b border-[#E2E8F0] bg-white px-5 py-2">
        {/* Add row (opt-in per page, suppressed in trash view) */}
        {addRowEnabled && (
          <button
            type="button"
            onClick={() => { void handleAddRow() }}
            title="행 추가 (Shift+Enter)"
            className="h-[28px] rounded-[4px] bg-[#2D7FF9] px-[10px] text-[12px] font-medium text-white hover:bg-[#1E6FE0] transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            추가
          </button>
        )}

        {/* Filter button + modal */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowFilterModal(v => !v); setShowSortModal(false) }}
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5l-4-5z" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            필터
            {filterState.conditions.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{countAllConditions(filterState)}</span>
            )}
          </button>
          {showFilterModal && (
            <FilterModal
              columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string; fieldType: string } => typeof c.data === 'string' && c.data !== '') as FilterColDef[]}
              filterState={filterState}
              selectOptions={filterSelectOptions}
              onChange={setFilterState}
              onApply={handleLoad}
              onClose={() => setShowFilterModal(false)}
            />
          )}
        </div>

        {/* Server-side search */}
        <div className="relative flex-shrink-0">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#9CA3AF" strokeWidth="1.2"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="검색..."
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            className="w-48 h-[28px] rounded-[4px] border border-[#E2E8F0] pl-8 pr-[10px] text-[12px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#2D7FF9] focus:outline-none focus:shadow-[0_0_0_2px_rgba(45,127,249,0.15)]"
          />
        </div>

        {/* Sort button + modal */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowSortModal(v => !v); setShowFilterModal(false) }}
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 2v10M2.5 4.5l2-2.5 2 2.5M9.5 12V2M7.5 9.5l2 2.5 2-2.5" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            정렬
            {sortConditions.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-[#2D7FF9] text-white text-[10px] font-medium px-1">{sortConditions.length}</span>
            )}
          </button>
          {showSortModal && (
            <SortModal
              columns={COLUMNS.filter((c): c is typeof c & { data: string; title: string } => typeof c.data === 'string' && c.data !== '') as SortColDef[]}
              conditions={sortConditions}
              onChange={setSortConditions}
              onApply={handleLoad}
              onClose={() => setShowSortModal(false)}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count — right side */}
        <div className="flex items-center text-[12px] text-[#6B7280] whitespace-nowrap flex-shrink-0 mr-2">
          {filterCount !== null && searchCount === null && (
            <span>{filterCount.toLocaleString()}건</span>
          )}
          {filterCount !== null && searchCount !== null && (
            <span>{filterCount.toLocaleString()}건 중 {searchCount.toLocaleString()}건 검색됨</span>
          )}
          {apiError && <span className="text-red-500 ml-2">{apiError}</span>}
        </div>

        {/* Row height selector */}
        <div className="relative flex-shrink-0" ref={rowHeightMenuRef}>
          <button
            type="button"
            onClick={() => { setShowRowHeightMenu(v => !v); setShowColumnManager(false); setShowExportMenu(false) }}
            title="행 높이"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3h10M2 7h10M2 11h10" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {ROW_HEIGHT_LABEL[rowHeight]}
          </button>
          {showRowHeightMenu && (
            <div className="absolute right-0 top-[34px] z-[1000] w-[140px] rounded-[6px] border border-[#E2E8F0] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              {(['short', 'medium', 'tall', 'extra-tall'] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => { setRowHeight(h); setShowRowHeightMenu(false) }}
                  className={`flex w-full items-center justify-between px-3 py-[6px] text-[12px] hover:bg-[#F8FAFC] ${rowHeight === h ? 'text-[#2D7FF9]' : 'text-[#374151]'}`}
                >
                  <span>{ROW_HEIGHT_LABEL[h]}</span>
                  <span className="text-[11px] text-[#9CA3AF]">{ROW_HEIGHT_PX[h]}px</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column manager */}
        <div className="relative flex-shrink-0" ref={columnManagerRef}>
          <button
            type="button"
            onClick={() => { setShowColumnManager(v => !v); setShowRowHeightMenu(false); setShowExportMenu(false) }}
            title="컬럼 관리"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2h10v10H2z M5.5 2v10 M8.5 2v10" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            컬럼
            {hiddenColumns.size > 0 && (
              <span className="text-[#9CA3AF]">· {hiddenColumns.size}개 숨김</span>
            )}
          </button>
          {showColumnManager && (
            <ColumnManagerDropdown
              columns={managedColumns}
              hiddenColumns={hiddenColumns}
              onToggleHidden={handleToggleHidden}
              onShowAll={handleShowAll}
              onHideAll={handleHideAll}
              onReorder={handleReorderColumn}
              onResetView={handleResetView}
              onClose={() => setShowColumnManager(false)}
            />
          )}
        </div>

        {/* Export */}
        <div className="relative flex-shrink-0" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => { setShowExportMenu(v => !v); setShowRowHeightMenu(false); setShowColumnManager(false) }}
            title="내보내기"
            className="h-[28px] rounded-[4px] border border-[#E2E8F0] px-[10px] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v7m0 0l-2.5-2.5M7 9l2.5-2.5M2.5 11.5h9" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            내보내기
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-[34px] z-[1000] w-[160px] rounded-[6px] border border-[#E2E8F0] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <button
                type="button"
                onClick={() => { handleExportCSV(false); setShowExportMenu(false) }}
                className="flex w-full items-center px-3 py-[6px] text-[12px] text-[#374151] hover:bg-[#F8FAFC]"
              >
                전체 내보내기 (CSV)
              </button>
              <button
                type="button"
                onClick={() => { handleExportCSV(true); setShowExportMenu(false) }}
                className="flex w-full items-center px-3 py-[6px] text-[12px] text-[#374151] hover:bg-[#F8FAFC]"
              >
                선택 행만 (CSV)
              </button>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts */}
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          title="키보드 단축키"
          aria-label="키보드 단축키"
          className="h-[28px] w-[28px] flex-shrink-0 rounded-[4px] border border-[#E2E8F0] text-[12px] text-[#374151] hover:bg-[#F8FAFC] transition-colors flex items-center justify-center"
        >
          ?
        </button>
      </div>

      {/* Empty state */}
      {!hasData && !loading && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[#9CA3AF]">
          필터를 설정하고 적용하면 데이터가 로드됩니다
        </div>
      )}

      {/* Loading overlay — center of screen */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <span className="text-[14px] text-[#6B7280] font-medium">로딩 중…</span>
        </div>
      )}

      {/* Grid area — flex-1, fills remaining height */}
      <div className={`relative flex flex-col flex-1 min-h-0 overflow-hidden${!hasData && !loading ? ' hidden' : ''}`}>
        {/* HOT container — fills all available space */}
        <div
          ref={hotContainerRef}
          className={`flex-1 min-h-0 overflow-hidden${loading ? ' opacity-30 pointer-events-none' : ''}`}
        >
          <div ref={containerRef} />
        </div>

        {/* Infinite scroll loading indicator */}
        {loadingMore && (
          <div className="flex-shrink-0 flex justify-center items-center py-2 border-t border-[#E5E7EB] bg-white text-[12px] text-[#9CA3AF]">
            로딩 중…
          </div>
        )}

        {/* Custom horizontal scrollbar — overlaps SummaryBar, fades in on
            scroll. Single responsibility: mirror master's scrollLeft.
            Writing master.scrollLeft is enough because HOT's Overlays
            plugin propagates it to ht_clone_top, and master.clientWidth
            now equals top.clientWidth so the sync is exact. */}
        <div
          ref={customScrollbarRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 6, // leave room for the vertical bar at the corner
            height: 6,
            overflowX: 'scroll',
            overflowY: 'hidden',
            opacity: 0,
            transition: 'opacity 0.4s ease',
            zIndex: 20,
          }}
          onScroll={() => {
            if (syncingCustomScrollRef.current || !customScrollbarRef.current) return
            const masterEl = hotRef.current?.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
            if (!masterEl) return
            const x = customScrollbarRef.current.scrollLeft
            if (masterEl.scrollLeft === x) return
            syncingCustomScrollRef.current = true
            masterEl.scrollLeft = x
            syncingCustomScrollRef.current = false
            // master.scroll fires async; the listener there handles
            // summary transform, shadow class, and mirror-back guard.
          }}
        >
          <div
            ref={customScrollbarInnerRef}
            style={{ height: 1, width: colWidths.reduce((s, w) => s + w, 0) }}
          />
        </div>

        {/* Custom vertical scrollbar — overlay on the right edge. Mirrors
            master.scrollTop. Replaces the native scrollbar we disabled
            (see globals.css for the rationale — master.clientWidth must
            equal top.clientWidth to prevent right-edge header/body drift). */}
        <div
          ref={customVScrollbarRef}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 6, // leave room for the horizontal bar at the corner
            width: 6,
            overflowX: 'hidden',
            overflowY: 'scroll',
            opacity: 0,
            transition: 'opacity 0.4s ease',
            zIndex: 20,
          }}
          onScroll={() => {
            if (syncingCustomVScrollRef.current || !customVScrollbarRef.current) return
            const masterEl = hotRef.current?.rootElement?.querySelector('.ht_master .wtHolder') as HTMLElement | null
            if (!masterEl) return
            const y = customVScrollbarRef.current.scrollTop
            if (masterEl.scrollTop === y) return
            syncingCustomVScrollRef.current = true
            masterEl.scrollTop = y
            syncingCustomVScrollRef.current = false
          }}
        >
          <div
            ref={customVScrollbarInnerRef}
            style={{ width: 1, height: 1 }}
          />
        </div>

        {/* Summary bar */}
        <SummaryBar
          rows={rows as unknown as Record<string, unknown>[]}
          selectedRowIndices={selectedRowIndices}
          columns={(COLUMNS as unknown) as SummaryColDef[]}
          colWidths={colWidths}
          innerRef={summaryInnerRef}
        />
      </div>

      {/* select 컬럼 커스텀 드롭다운 */}
      {selectMenu && (
        <div
          ref={selectMenuRef}
          role="listbox"
          aria-label="옵션 선택"
          style={{ position: 'fixed', top: selectMenu.top, left: selectMenu.left, minWidth: selectMenu.width, zIndex: 9999 }}
          className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 max-h-[320px] overflow-y-auto"
        >
          {selectMenu.options.map(({ value, bg }) => (
            <div
              key={value}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="flex items-center px-2 py-[5px] rounded-[4px] cursor-pointer hover:bg-[#F8FAFC]"
              onMouseDown={e => { e.preventDefault(); handleSelectOption(selectMenu.column, selectMenu.row, value) }}
            >
              <span
                style={{ background: bg }}
                className="inline-flex items-center px-2 py-[2px] rounded-[9999px] text-[13px] font-medium text-[#111827] whitespace-nowrap"
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            background: toast.type === 'error' ? '#EF4444' : '#1F2937',
            color: '#fff', fontSize: 13,
            padding: '8px 16px', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => {
                showToast(null)
                toast.undoAction?.()
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              실행취소
            </button>
          )}
        </div>
      )}

      {/* Delete mini bar */}
      {selectedRowIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#1F2937',
          color: '#fff',
          fontSize: 13,
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span>{selectedRowIds.size}개 선택됨</span>
          <button
            onClick={handleClearSelection}
            style={{
              background: 'transparent',
              border: '1px solid #4B5563',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            선택 해제
          </button>
          {trashedMode ? (
            <>
              <button
                onClick={handleRestoreSelected}
                style={{
                  background: '#2D7FF9',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                복구
              </button>
              <button
                onClick={handlePermanentDeleteSelected}
                style={{
                  background: '#EF4444',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                영구삭제
              </button>
            </>
          ) : (
            <button
              onClick={handleDeleteSelected}
              style={{
                background: '#EF4444',
                border: 'none',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              삭제
            </button>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      {galleryImages && (
        <ImageModal
          images={galleryImages}
          startIndex={galleryStartIdx}
          onClose={() => setGalleryImages(null)}
        />
      )}
    </div>
  )
}
