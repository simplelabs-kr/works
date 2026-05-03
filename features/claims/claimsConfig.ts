// Claims (클레임) grid configuration — flat_claims.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { ClaimItem, ClaimRow } from './claimsTypes'

export const CLAIMS_VIEW_PAGE_KEY = 'claims'

export const CLAIMS_EDITABLE_FIELDS: Record<string, string> = {
  '날짜': '날짜',
  'status': 'status',
  '문제_현상': '문제_현상',
  '원인': '원인',
  '해결': '해결',
  '확인_필요': '확인_필요',
  '확인_필요_사항': '확인_필요_사항',
}

export const CLAIMS_COLUMNS = [
  { data: '제품명',         title: '제품명',         readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '제품코드',       title: '제품코드',       readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '날짜',           title: '날짜',           readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: 'status',         title: 'status',         readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '문제_현상',      title: '문제_현상',      readOnly: false, width: 200, fieldType: 'text' as FieldType },
  { data: '원인',           title: '원인',           readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '해결',           title: '해결',           readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '확인_필요',      title: '확인_필요',      readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '확인_필요_사항', title: '확인_필요_사항', readOnly: false, width: 150, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CLAIMS_COL_HEADERS: string[] = (CLAIMS_COLUMNS as any[]).map((c) => c.title ?? '')

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function boolFlag(v: unknown): boolean {
  return v === true
}
function dateOrEmpty(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function transformClaimRow(item: ClaimItem): ClaimRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    날짜: dateOrEmpty(item.날짜),
    status: str(item.status),
    문제_현상: str(item.문제_현상),
    원인: str(item.원인),
    해결: str(item.해결),
    확인_필요: boolFlag(item.확인_필요),
    확인_필요_사항: str(item.확인_필요_사항),
  }
}

function claimsMergeRealtimeUpdate(
  prev: ClaimRow,
  payloadNew: Record<string, unknown>,
): ClaimRow {
  const n = payloadNew
  return {
    ...prev,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    날짜: n.날짜 !== undefined ? dateOrEmpty(n.날짜) : prev.날짜,
    status: n.status !== undefined ? str(n.status) : prev.status,
    문제_현상: n.문제_현상 !== undefined ? str(n.문제_현상) : prev.문제_현상,
    원인: n.원인 !== undefined ? str(n.원인) : prev.원인,
    해결: n.해결 !== undefined ? str(n.해결) : prev.해결,
    확인_필요: n.확인_필요 !== undefined ? boolFlag(n.확인_필요) : prev.확인_필요,
    확인_필요_사항: n.확인_필요_사항 !== undefined ? str(n.확인_필요_사항) : prev.확인_필요_사항,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const claimsPageConfig: PageConfig<ClaimItem, ClaimRow> = {
  pageKey: CLAIMS_VIEW_PAGE_KEY,
  pageName: '클레임',
  apiBase: '/api/claims',
  realtimeChannel: 'claims_changes',
  realtimeTable: 'flat_claims',
  selectOptionsTable: 'claims',
  columns: CLAIMS_COLUMNS,
  colHeaders: CLAIMS_COL_HEADERS,
  editableFields: CLAIMS_EDITABLE_FIELDS,
  transformRow: transformClaimRow,
  mergeRealtimeUpdate: claimsMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
