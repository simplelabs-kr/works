// Stones (스톤) grid configuration — flat_stones.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { StoneItem, StoneRow } from './stonesTypes'

export const STONES_VIEW_PAGE_KEY = 'stones'

export const STONES_EDITABLE_FIELDS: Record<string, string> = {
  '스톤명': '스톤명',
  '사이즈_mm': '사이즈_mm',
  '원가_스톤': '원가_스톤',
  '원가_세팅비': '원가_세팅비',
  '청구_금액': '청구_금액',
  '개당_중량': '개당_중량',
  '추가_정보': '추가_정보',
}

export const STONES_COLUMNS = [
  { data: '스톤명',           title: '스톤명',           readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: 'stone_type_명칭',  title: 'stone_type_명칭',  readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: 'stone_cut_컷팅',   title: 'stone_cut_컷팅',   readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '사이즈_mm',        title: '사이즈_mm',        readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: 'supplier_이름',    title: 'supplier_이름',    readOnly: true,  width: 120, fieldType: 'lookup' as FieldType },
  { data: '원가_스톤',        title: '원가_스톤',        readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_세팅비',      title: '원가_세팅비',      readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '청구_금액',        title: '청구_금액',        readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '개당_중량',        title: '개당_중량',        readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가_정보',        title: '추가_정보',        readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STONES_COL_HEADERS: string[] = (STONES_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function transformStoneRow(item: StoneItem): StoneRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    스톤명: str(item.스톤명),
    stone_type_명칭: str(item.stone_type_명칭),
    stone_cut_컷팅: str(item.stone_cut_컷팅),
    사이즈_mm: str(item.사이즈_mm),
    supplier_이름: str(item.supplier_이름),
    원가_스톤: numOrNull(item.원가_스톤),
    원가_세팅비: numOrNull(item.원가_세팅비),
    청구_금액: numOrNull(item.청구_금액),
    개당_중량: numOrNull(item.개당_중량),
    추가_정보: str(item.추가_정보),
  }
}

function stonesMergeRealtimeUpdate(
  prev: StoneRow,
  payloadNew: Record<string, unknown>,
): StoneRow {
  const n = payloadNew
  return {
    ...prev,
    스톤명: n.스톤명 !== undefined ? str(n.스톤명) : prev.스톤명,
    stone_type_명칭: n.stone_type_명칭 !== undefined ? str(n.stone_type_명칭) : prev.stone_type_명칭,
    stone_cut_컷팅: n.stone_cut_컷팅 !== undefined ? str(n.stone_cut_컷팅) : prev.stone_cut_컷팅,
    사이즈_mm: n.사이즈_mm !== undefined ? str(n.사이즈_mm) : prev.사이즈_mm,
    supplier_이름: n.supplier_이름 !== undefined ? str(n.supplier_이름) : prev.supplier_이름,
    원가_스톤: n.원가_스톤 !== undefined ? numOrNull(n.원가_스톤) : prev.원가_스톤,
    원가_세팅비: n.원가_세팅비 !== undefined ? numOrNull(n.원가_세팅비) : prev.원가_세팅비,
    청구_금액: n.청구_금액 !== undefined ? numOrNull(n.청구_금액) : prev.청구_금액,
    개당_중량: n.개당_중량 !== undefined ? numOrNull(n.개당_중량) : prev.개당_중량,
    추가_정보: n.추가_정보 !== undefined ? str(n.추가_정보) : prev.추가_정보,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const stonesPageConfig: PageConfig<StoneItem, StoneRow> = {
  pageKey: STONES_VIEW_PAGE_KEY,
  pageName: '스톤',
  apiBase: '/api/stones',
  realtimeChannel: 'stones_changes',
  realtimeTable: 'flat_stones',
  selectOptionsTable: 'stones',
  columns: STONES_COLUMNS,
  colHeaders: STONES_COL_HEADERS,
  editableFields: STONES_EDITABLE_FIELDS,
  transformRow: transformStoneRow,
  mergeRealtimeUpdate: stonesMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
