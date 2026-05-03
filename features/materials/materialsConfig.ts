// Materials (원부자재 재고) grid configuration — flat_materials.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { MaterialItem, MaterialRow } from './materialsTypes'

export const MATERIALS_VIEW_PAGE_KEY = 'materials'

export const MATERIALS_EDITABLE_FIELDS: Record<string, string> = {
  '품목명': '품목명',
  'type': 'type',
}

export const MATERIALS_COLUMNS = [
  { data: '품목명',         title: '품목명',         readOnly: false, width: 200, fieldType: 'text' as FieldType },
  { data: 'type',           title: 'type',           readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: 'supplier_이름',  title: 'supplier_이름',  readOnly: true,  width: 120, fieldType: 'lookup' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MATERIALS_COL_HEADERS: string[] = (MATERIALS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function transformMaterialRow(item: MaterialItem): MaterialRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    품목명: str(item.품목명),
    type: str(item.type),
    supplier_이름: str(item.supplier_이름),
  }
}

function materialsMergeRealtimeUpdate(
  prev: MaterialRow,
  payloadNew: Record<string, unknown>,
): MaterialRow {
  const n = payloadNew
  return {
    ...prev,
    품목명: n.품목명 !== undefined ? str(n.품목명) : prev.품목명,
    type: n.type !== undefined ? str(n.type) : prev.type,
    supplier_이름: n.supplier_이름 !== undefined ? str(n.supplier_이름) : prev.supplier_이름,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const materialsPageConfig: PageConfig<MaterialItem, MaterialRow> = {
  pageKey: MATERIALS_VIEW_PAGE_KEY,
  pageName: '원부자재 재고',
  apiBase: '/api/materials',
  realtimeChannel: 'materials_changes',
  realtimeTable: 'flat_materials',
  selectOptionsTable: 'materials',
  columns: MATERIALS_COLUMNS,
  colHeaders: MATERIALS_COL_HEADERS,
  editableFields: MATERIALS_EDITABLE_FIELDS,
  transformRow: transformMaterialRow,
  mergeRealtimeUpdate: materialsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
