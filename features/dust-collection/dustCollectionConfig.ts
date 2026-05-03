// Dust Collection (집진) grid configuration — flat_dust_collection.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { DustCollectionItem, DustCollectionRow } from './dustCollectionTypes'

export const DUST_COLLECTION_VIEW_PAGE_KEY = 'dust-collection'

export const DUST_COLLECTION_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '유형': '유형',
  '함량': '함량',
  '축적일': '축적일',
  '중량': '중량',
  '함량비': '함량비',
  '예상_순금_중량': '예상_순금_중량',
}

export const DUST_COLLECTION_COLUMNS = [
  { data: '고유번호',       title: '고유번호',       readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '유형',           title: '유형',           readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '함량',           title: '함량',           readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '축적일',         title: '축적일',         readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '중량',           title: '중량',           readOnly: false, width: 90,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '함량비',         title: '함량비',         readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '예상_순금_중량', title: '예상_순금_중량', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DUST_COLLECTION_COL_HEADERS: string[] = (DUST_COLLECTION_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function transformDustCollectionRow(item: DustCollectionItem): DustCollectionRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    유형: str(item.유형),
    함량: str(item.함량),
    축적일: dateOrEmpty(item.축적일),
    중량: numOrNull(item.중량),
    함량비: numOrNull(item.함량비),
    예상_순금_중량: numOrNull(item.예상_순금_중량),
  }
}

function dustCollectionMergeRealtimeUpdate(
  prev: DustCollectionRow,
  payloadNew: Record<string, unknown>,
): DustCollectionRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    유형: n.유형 !== undefined ? str(n.유형) : prev.유형,
    함량: n.함량 !== undefined ? str(n.함량) : prev.함량,
    축적일: n.축적일 !== undefined ? dateOrEmpty(n.축적일) : prev.축적일,
    중량: n.중량 !== undefined ? numOrNull(n.중량) : prev.중량,
    함량비: n.함량비 !== undefined ? numOrNull(n.함량비) : prev.함량비,
    예상_순금_중량: n.예상_순금_중량 !== undefined ? numOrNull(n.예상_순금_중량) : prev.예상_순금_중량,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const dustCollectionPageConfig: PageConfig<DustCollectionItem, DustCollectionRow> = {
  pageKey: DUST_COLLECTION_VIEW_PAGE_KEY,
  pageName: '집진',
  apiBase: '/api/dust-collection',
  realtimeChannel: 'dust_collection_changes',
  realtimeTable: 'flat_dust_collection',
  selectOptionsTable: 'dust_collection',
  columns: DUST_COLLECTION_COLUMNS,
  colHeaders: DUST_COLLECTION_COL_HEADERS,
  editableFields: DUST_COLLECTION_EDITABLE_FIELDS,
  transformRow: transformDustCollectionRow,
  mergeRealtimeUpdate: dustCollectionMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
