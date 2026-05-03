// Suppliers (거래처) grid configuration — flat_suppliers.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { SupplierItem, SupplierRow } from './suppliersTypes'

export const SUPPLIERS_VIEW_PAGE_KEY = 'suppliers'

export const SUPPLIERS_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '연락처': '연락처',
  '주소': '주소',
  '매입_품목': '매입_품목',
}

export const SUPPLIERS_COLUMNS = [
  { data: '이름',     title: '이름',     readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '연락처',   title: '연락처',   readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '주소',     title: '주소',     readOnly: false, width: 200, fieldType: 'text' as FieldType },
  { data: '매입_품목', title: '매입_품목', readOnly: false, width: 200, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SUPPLIERS_COL_HEADERS: string[] = (SUPPLIERS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function transformSupplierRow(item: SupplierItem): SupplierRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    이름: str(item.이름),
    연락처: str(item.연락처),
    주소: str(item.주소),
    매입_품목: str(item.매입_품목),
  }
}

function suppliersMergeRealtimeUpdate(
  prev: SupplierRow,
  payloadNew: Record<string, unknown>,
): SupplierRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    연락처: n.연락처 !== undefined ? str(n.연락처) : prev.연락처,
    주소: n.주소 !== undefined ? str(n.주소) : prev.주소,
    매입_품목: n.매입_품목 !== undefined ? str(n.매입_품목) : prev.매입_품목,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const suppliersPageConfig: PageConfig<SupplierItem, SupplierRow> = {
  pageKey: SUPPLIERS_VIEW_PAGE_KEY,
  pageName: '거래처',
  apiBase: '/api/suppliers',
  realtimeChannel: 'suppliers_changes',
  realtimeTable: 'flat_suppliers',
  selectOptionsTable: 'suppliers',
  columns: SUPPLIERS_COLUMNS,
  colHeaders: SUPPLIERS_COL_HEADERS,
  editableFields: SUPPLIERS_EDITABLE_FIELDS,
  transformRow: transformSupplierRow,
  mergeRealtimeUpdate: suppliersMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
