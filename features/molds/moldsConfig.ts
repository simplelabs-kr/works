// Molds (몰드/가다) grid configuration — flat_molds.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { MoldItem, MoldRow } from './moldsTypes'

export const MOLDS_VIEW_PAGE_KEY = 'molds'

export const MOLDS_EDITABLE_FIELDS: Record<string, string> = {
  '가다번호': '가다번호',
  '보유_여부': '보유_여부',
  '확인': '확인',
  '출입사항': '출입사항',
  '비고': '비고',
}

export const MOLDS_COLUMNS = [
  { data: '가다번호',     title: '가다번호',     readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '제품명',       title: '제품명',       readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '제품코드',     title: '제품코드',     readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '보관함_위치',  title: '보관함_위치',  readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '보유_여부',    title: '보유_여부',    readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '확인',         title: '확인',         readOnly: false, width: 70,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '출입사항',     title: '출입사항',     readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '비고',         title: '비고',         readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MOLDS_COL_HEADERS: string[] = (MOLDS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function boolFlag(v: unknown): boolean {
  return v === true
}

function transformMoldRow(item: MoldItem): MoldRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    가다번호: str(item.가다번호),
    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    보관함_위치: str(item.보관함_위치),
    보유_여부: boolFlag(item.보유_여부),
    확인: boolFlag(item.확인),
    출입사항: str(item.출입사항),
    비고: str(item.비고),
  }
}

function moldsMergeRealtimeUpdate(
  prev: MoldRow,
  payloadNew: Record<string, unknown>,
): MoldRow {
  const n = payloadNew
  return {
    ...prev,
    가다번호: n.가다번호 !== undefined ? str(n.가다번호) : prev.가다번호,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    보관함_위치: n.보관함_위치 !== undefined ? str(n.보관함_위치) : prev.보관함_위치,
    보유_여부: n.보유_여부 !== undefined ? boolFlag(n.보유_여부) : prev.보유_여부,
    확인: n.확인 !== undefined ? boolFlag(n.확인) : prev.확인,
    출입사항: n.출입사항 !== undefined ? str(n.출입사항) : prev.출입사항,
    비고: n.비고 !== undefined ? str(n.비고) : prev.비고,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const moldsPageConfig: PageConfig<MoldItem, MoldRow> = {
  pageKey: MOLDS_VIEW_PAGE_KEY,
  pageName: '몰드',
  apiBase: '/api/molds',
  realtimeChannel: 'molds_changes',
  realtimeTable: 'flat_molds',
  selectOptionsTable: 'molds',
  columns: MOLDS_COLUMNS,
  colHeaders: MOLDS_COL_HEADERS,
  editableFields: MOLDS_EDITABLE_FIELDS,
  transformRow: transformMoldRow,
  mergeRealtimeUpdate: moldsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
