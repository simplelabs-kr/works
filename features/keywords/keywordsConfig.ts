// Keywords (키워드) grid configuration — flat_keywords.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { KeywordItem, KeywordRow } from './keywordsTypes'

export const KEYWORDS_VIEW_PAGE_KEY = 'keywords'

export const KEYWORDS_EDITABLE_FIELDS: Record<string, string> = {
  'keyword': 'keyword',
}

export const KEYWORDS_COLUMNS = [
  { data: 'keyword', title: 'keyword', readOnly: false, width: 200, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const KEYWORDS_COL_HEADERS: string[] = (KEYWORDS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function transformKeywordRow(item: KeywordItem): KeywordRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    keyword: str(item.keyword),
  }
}

function keywordsMergeRealtimeUpdate(
  prev: KeywordRow,
  payloadNew: Record<string, unknown>,
): KeywordRow {
  const n = payloadNew
  return {
    ...prev,
    keyword: n.keyword !== undefined ? str(n.keyword) : prev.keyword,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const keywordsPageConfig: PageConfig<KeywordItem, KeywordRow> = {
  pageKey: KEYWORDS_VIEW_PAGE_KEY,
  pageName: '키워드',
  apiBase: '/api/keywords',
  realtimeChannel: 'keywords_changes',
  realtimeTable: 'flat_keywords',
  selectOptionsTable: 'keywords',
  columns: KEYWORDS_COLUMNS,
  colHeaders: KEYWORDS_COL_HEADERS,
  editableFields: KEYWORDS_EDITABLE_FIELDS,
  transformRow: transformKeywordRow,
  mergeRealtimeUpdate: keywordsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
