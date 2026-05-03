// Samples (샘플) grid configuration — flat_samples.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import type { SampleItem, SampleRow } from './samplesTypes'

export const SAMPLES_VIEW_PAGE_KEY = 'samples'

export const SAMPLES_EDITABLE_FIELDS: Record<string, string> = {
  '이름': '이름',
  '소재': '소재',
  '도금_색상': '도금_색상',
  '스톤': '스톤',
  '수량': '수량',
  '호수': '호수',
  '체인_길이': '체인_길이',
  '기타_옵션': '기타_옵션',
  '데드라인': '데드라인',
  '공임조정액': '공임조정액',
}

export const SAMPLES_COLUMNS = [
  { data: '이름',      title: '이름',      readOnly: false, width: 160, fieldType: 'text' as FieldType },
  { data: '제품명',    title: '제품명',    readOnly: true,  width: 160, fieldType: 'lookup' as FieldType },
  { data: '제품코드',  title: '제품코드',  readOnly: true,  width: 100, fieldType: 'lookup' as FieldType },
  { data: '소재',      title: '소재',      readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '도금_색상', title: '도금_색상', readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '스톤',      title: '스톤',      readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '수량',      title: '수량',      readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '호수',      title: '호수',      readOnly: false, width: 70,  fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '체인_길이', title: '체인_길이', readOnly: false, width: 80,  fieldType: 'text' as FieldType },
  { data: '기타_옵션', title: '기타_옵션', readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '데드라인',  title: '데드라인',  readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '공임조정액', title: '공임조정액', readOnly: false, width: 90, fieldType: 'number' as FieldType, type: 'numeric' },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SAMPLES_COL_HEADERS: string[] = (SAMPLES_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformSampleRow(item: SampleItem): SampleRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    이름: str(item.이름),
    제품명: str(item.제품명),
    제품코드: str(item.제품코드),
    소재: str(item.소재),
    도금_색상: str(item.도금_색상),
    스톤: str(item.스톤),
    수량: numOrNull(item.수량),
    호수: numOrNull(item.호수),
    체인_길이: str(item.체인_길이),
    기타_옵션: str(item.기타_옵션),
    데드라인: dateOrEmpty(item.데드라인),
    공임조정액: numOrNull(item.공임조정액),
  }
}

function samplesMergeRealtimeUpdate(
  prev: SampleRow,
  payloadNew: Record<string, unknown>,
): SampleRow {
  const n = payloadNew
  return {
    ...prev,
    이름: n.이름 !== undefined ? str(n.이름) : prev.이름,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    소재: n.소재 !== undefined ? str(n.소재) : prev.소재,
    도금_색상: n.도금_색상 !== undefined ? str(n.도금_색상) : prev.도금_색상,
    스톤: n.스톤 !== undefined ? str(n.스톤) : prev.스톤,
    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    호수: n.호수 !== undefined ? numOrNull(n.호수) : prev.호수,
    체인_길이: n.체인_길이 !== undefined ? str(n.체인_길이) : prev.체인_길이,
    기타_옵션: n.기타_옵션 !== undefined ? str(n.기타_옵션) : prev.기타_옵션,
    데드라인: n.데드라인 !== undefined ? dateOrEmpty(n.데드라인) : prev.데드라인,
    공임조정액: n.공임조정액 !== undefined ? numOrNull(n.공임조정액) : prev.공임조정액,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const samplesPageConfig: PageConfig<SampleItem, SampleRow> = {
  pageKey: SAMPLES_VIEW_PAGE_KEY,
  pageName: '샘플',
  apiBase: '/api/samples',
  realtimeChannel: 'samples_changes',
  realtimeTable: 'flat_samples',
  selectOptionsTable: 'samples',
  columns: SAMPLES_COLUMNS,
  colHeaders: SAMPLES_COL_HEADERS,
  editableFields: SAMPLES_EDITABLE_FIELDS,
  transformRow: transformSampleRow,
  mergeRealtimeUpdate: samplesMergeRealtimeUpdate,
  groupBy: { enabled: true, allowedTypes: ['select', 'checkbox'], defaultColumn: undefined },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
