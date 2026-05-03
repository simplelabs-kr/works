// Other Materials (기타 원부자재) grid configuration — flat_other_materials.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { OtherMaterialItem, OtherMaterialRow } from './otherMaterialsTypes'

export const OTHER_MATERIALS_VIEW_PAGE_KEY = 'other-materials'

export const OTHER_MATERIALS_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '종류': '종류',
  '소재': '소재',
  '세부_소재': '세부_소재',
  '모델명': '모델명',
  '공임': '공임',
  '중량': '중량',
  '컵_크기': '컵_크기',
  '침_제원': '침_제원',
  '링크': '링크',
  '비고': '비고',
}

export const OTHER_MATERIALS_COLUMNS = [
  { data: '이름',           title: '이름',           readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: '종류',           title: '종류',           readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: 'supplier_이름',  title: 'supplier_이름',  readOnly: true,  width: 120, fieldType: 'lookup' as FieldType },
  { data: '소재',           title: '소재',           readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '세부_소재',      title: '세부_소재',      readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '모델명',         title: '모델명',         readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '공임',           title: '공임',           readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '중량',           title: '중량',           readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '컵_크기',        title: '컵_크기',        readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '침_제원',        title: '침_제원',        readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '링크',           title: '링크',           readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '비고',           title: '비고',           readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OTHER_MATERIALS_COL_HEADERS: string[] = (OTHER_MATERIALS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function transformOtherMaterialRow(item: OtherMaterialItem): OtherMaterialRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    이름: str(item.이름),
    종류: str(item.종류),
    supplier_이름: str(item.supplier_이름),
    소재: str(item.소재),
    세부_소재: str(item.세부_소재),
    모델명: str(item.모델명),
    공임: numOrNull(item.공임),
    중량: numOrNull(item.중량),
    컵_크기: numOrNull(item.컵_크기),
    침_제원: str(item.침_제원),
    링크: str(item.링크),
    비고: str(item.비고),
  }
}

function otherMaterialsMergeRealtimeUpdate(
  prev: OtherMaterialRow,
  payloadNew: Record<string, unknown>,
): OtherMaterialRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    종류: n.종류 !== undefined ? str(n.종류) : prev.종류,
    supplier_이름: n.supplier_이름 !== undefined ? str(n.supplier_이름) : prev.supplier_이름,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    세부_소재: n.세부_소재 !== undefined ? str(n.세부_소재) : prev.세부_소재,
    모델명: n.모델명 !== undefined ? str(n.모델명) : prev.모델명,
    공임: n.공임 !== undefined ? numOrNull(n.공임) : prev.공임,
    중량: n.중량 !== undefined ? numOrNull(n.중량) : prev.중량,
    컵_크기: n.컵_크기 !== undefined ? numOrNull(n.컵_크기) : prev.컵_크기,
    침_제원: n.침_제원 !== undefined ? str(n.침_제원) : prev.침_제원,
    링크: n.링크 !== undefined ? str(n.링크) : prev.링크,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const otherMaterialsPageConfig: PageConfig<OtherMaterialItem, OtherMaterialRow> = {
  pageKey: OTHER_MATERIALS_VIEW_PAGE_KEY,
  pageName: '기타 원부자재',
  apiBase: '/api/other-materials',
  realtimeChannel: 'other_materials_changes',
  realtimeTable: 'flat_other_materials',
  selectOptionsTable: 'other_materials',
  columns: OTHER_MATERIALS_COLUMNS,
  colHeaders: OTHER_MATERIALS_COL_HEADERS,
  editableFields: OTHER_MATERIALS_EDITABLE_FIELDS,
  transformRow: transformOtherMaterialRow,
  mergeRealtimeUpdate: otherMaterialsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
