// Product Materials (제품별 원부자재) grid configuration — flat_product_materials.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { ProductMaterialItem, ProductMaterialRow } from './productMaterialsTypes'

export const PRODUCT_MATERIALS_VIEW_PAGE_KEY = 'product-materials'

export const PRODUCT_MATERIALS_EDITABLE_FIELDS: Record<string, string> = {
  '품목명': '품목명',
  '개수': '개수',
  '마감_잠금': '마감_잠금',
  '체인_두께': '체인_두께',
}

export const PRODUCT_MATERIALS_COLUMNS = [
  { data: '품목명',          title: '품목명',          readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: '제품명',          title: '제품명',          readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '제품코드',        title: '제품코드',        readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: 'material_품목명', title: 'material_품목명', readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '개수',            title: '개수',            readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '마감_잠금',       title: '마감_잠금',       readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '체인_두께',       title: '체인_두께',       readOnly: false, width: 80,  fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRODUCT_MATERIALS_COL_HEADERS: string[] = (PRODUCT_MATERIALS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function transformProductMaterialRow(item: ProductMaterialItem): ProductMaterialRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    품목명: str(item.품목명),
    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    material_품목명: str(item.material_품목명),
    개수: numOrNull(item.개수),
    마감_잠금: str(item.마감_잠금),
    체인_두께: str(item.체인_두께),
  }
}

function productMaterialsMergeRealtimeUpdate(
  prev: ProductMaterialRow,
  payloadNew: Record<string, unknown>,
): ProductMaterialRow {
  const n = payloadNew
  return {
    ...prev,
    품목명: n.품목명 !== undefined ? str(n.품목명) : prev.품목명,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    material_품목명: n.material_품목명 !== undefined ? str(n.material_품목명) : prev.material_품목명,
    개수: n.개수 !== undefined ? numOrNull(n.개수) : prev.개수,
    마감_잠금: n.마감_잠금 !== undefined ? str(n.마감_잠금) : prev.마감_잠금,
    체인_두께: n.체인_두께 !== undefined ? str(n.체인_두께) : prev.체인_두께,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const productMaterialsPageConfig: PageConfig<ProductMaterialItem, ProductMaterialRow> = {
  pageKey: PRODUCT_MATERIALS_VIEW_PAGE_KEY,
  pageName: '제품별 원부자재',
  apiBase: '/api/product-materials',
  realtimeChannel: 'product_materials_changes',
  realtimeTable: 'flat_product_materials',
  selectOptionsTable: 'product_materials',
  columns: PRODUCT_MATERIALS_COLUMNS,
  colHeaders: PRODUCT_MATERIALS_COL_HEADERS,
  editableFields: PRODUCT_MATERIALS_EDITABLE_FIELDS,
  transformRow: transformProductMaterialRow,
  mergeRealtimeUpdate: productMaterialsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
