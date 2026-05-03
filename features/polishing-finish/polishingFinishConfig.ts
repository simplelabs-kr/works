// Polishing Finish (연마 - 마감) grid configuration — flat_polishing_finish.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { PolishingFinishItem, PolishingFinishRow } from './polishingFinishTypes'

export const POLISHING_FINISH_VIEW_PAGE_KEY = 'polishing-finish'

export const POLISHING_FINISH_EDITABLE_FIELDS: Record<string, string> = {
  '고유번호': '고유번호',
  '소재': '소재',
  '번호': '번호',
  '들어간_날': '들어간_날',
  '나온_날': '나온_날',
  '전_수량': '전_수량',
  '후_수량': '후_수량',
  '죽은_수량': '죽은_수량',
  '전_중량_합금': '전_중량_합금',
  '후_중량_합금': '후_중량_합금',
  '절삭량_순금': '절삭량_순금',
  '절삭률': '절삭률',
  '제품류': '제품류',
}

export const POLISHING_FINISH_COLUMNS = [
  { data: '고유번호',     title: '고유번호',     readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '소재',         title: '소재',         readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '번호',         title: '번호',         readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '들어간_날',    title: '들어간_날',    readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '나온_날',      title: '나온_날',      readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '전_수량',      title: '전_수량',      readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_수량',      title: '후_수량',      readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '죽은_수량',    title: '죽은_수량',    readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '전_중량_합금', title: '전_중량_합금', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '후_중량_합금', title: '후_중량_합금', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭량_순금',  title: '절삭량_순금',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '절삭률',       title: '절삭률',       readOnly: false, width: 80,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '제품류',       title: '제품류',       readOnly: false, width: 100, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POLISHING_FINISH_COL_HEADERS: string[] = (POLISHING_FINISH_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformPolishingFinishRow(item: PolishingFinishItem): PolishingFinishRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    고유번호: str(item.고유번호),
    소재: str(item.소재),
    번호: str(item.번호),
    들어간_날: dateOrEmpty(item.들어간_날),
    나온_날: dateOrEmpty(item.나온_날),
    전_수량: numOrNull(item.전_수량),
    후_수량: numOrNull(item.후_수량),
    죽은_수량: numOrNull(item.죽은_수량),
    전_중량_합금: numOrNull(item.전_중량_합금),
    후_중량_합금: numOrNull(item.후_중량_합금),
    절삭량_순금: numOrNull(item.절삭량_순금),
    절삭률: numOrNull(item.절삭률),
    제품류: str(item.제품류),
  }
}

function polishingFinishMergeRealtimeUpdate(
  prev: PolishingFinishRow,
  payloadNew: Record<string, unknown>,
): PolishingFinishRow {
  const n = payloadNew
  return {
    ...prev,
    고유번호: n.고유번호 !== undefined ? str(n.고유번호) : prev.고유번호,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    번호: n.번호 !== undefined ? str(n.번호) : prev.번호,
    들어간_날: n.들어간_날 !== undefined ? dateOrEmpty(n.들어간_날) : prev.들어간_날,
    나온_날: n.나온_날 !== undefined ? dateOrEmpty(n.나온_날) : prev.나온_날,
    전_수량: n.전_수량 !== undefined ? numOrNull(n.전_수량) : prev.전_수량,
    후_수량: n.후_수량 !== undefined ? numOrNull(n.후_수량) : prev.후_수량,
    죽은_수량: n.죽은_수량 !== undefined ? numOrNull(n.죽은_수량) : prev.죽은_수량,
    전_중량_합금: n.전_중량_합금 !== undefined ? numOrNull(n.전_중량_합금) : prev.전_중량_합금,
    후_중량_합금: n.후_중량_합금 !== undefined ? numOrNull(n.후_중량_합금) : prev.후_중량_합금,
    절삭량_순금: n.절삭량_순금 !== undefined ? numOrNull(n.절삭량_순금) : prev.절삭량_순금,
    절삭률: n.절삭률 !== undefined ? numOrNull(n.절삭률) : prev.절삭률,
    제품류: n.제품류 !== undefined ? str(n.제품류) : prev.제품류,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const polishingFinishPageConfig: PageConfig<PolishingFinishItem, PolishingFinishRow> = {
  pageKey: POLISHING_FINISH_VIEW_PAGE_KEY,
  pageName: '연마 - 마감',
  apiBase: '/api/polishing-finish',
  realtimeChannel: 'polishing_finish_changes',
  realtimeTable: 'flat_polishing_finish',
  selectOptionsTable: 'polishing_finish',
  columns: POLISHING_FINISH_COLUMNS,
  colHeaders: POLISHING_FINISH_COL_HEADERS,
  editableFields: POLISHING_FINISH_EDITABLE_FIELDS,
  transformRow: transformPolishingFinishRow,
  mergeRealtimeUpdate: polishingFinishMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
