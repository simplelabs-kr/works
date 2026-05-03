// Metals (금속) grid configuration — flat_metals.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { MetalItem, MetalRow } from './metalsTypes'

export const METALS_VIEW_PAGE_KEY = 'metals'

export const METALS_EDITABLE_FIELDS: Record<string, string> = {
  'name': 'name',
  'metal': 'metal',
  'purity': 'purity',
  'is_composite': 'is_composite',
}

export const METALS_COLUMNS = [
  { data: 'name',         title: 'name',         readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: 'metal',        title: 'metal',        readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: 'purity',       title: 'purity',       readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: 'is_composite', title: 'is_composite', readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const METALS_COL_HEADERS: string[] = (METALS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function boolFlag(v: unknown): boolean {
  return v === true
}

function transformMetalRow(item: MetalItem): MetalRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    name: str(item.name),
    metal: str(item.metal),
    purity: numOrNull(item.purity),
    is_composite: boolFlag(item.is_composite),
  }
}

function metalsMergeRealtimeUpdate(
  prev: MetalRow,
  payloadNew: Record<string, unknown>,
): MetalRow {
  const n = payloadNew
  return {
    ...prev,
    name: n.name !== undefined ? str(n.name) : prev.name,
    metal: n.metal !== undefined ? str(n.metal) : prev.metal,
    purity: n.purity !== undefined ? numOrNull(n.purity) : prev.purity,
    is_composite: n.is_composite !== undefined ? boolFlag(n.is_composite) : prev.is_composite,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const metalsPageConfig: PageConfig<MetalItem, MetalRow> = {
  pageKey: METALS_VIEW_PAGE_KEY,
  pageName: '금속',
  apiBase: '/api/metals',
  realtimeChannel: 'metals_changes',
  realtimeTable: 'flat_metals',
  selectOptionsTable: 'metals',
  columns: METALS_COLUMNS,
  colHeaders: METALS_COL_HEADERS,
  editableFields: METALS_EDITABLE_FIELDS,
  transformRow: transformMetalRow,
  mergeRealtimeUpdate: metalsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
