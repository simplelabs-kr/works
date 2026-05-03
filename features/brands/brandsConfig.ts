// Brands (브랜드) grid configuration — flat_brands.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { BrandItem, BrandRow } from './brandsTypes'

export const BRANDS_VIEW_PAGE_KEY = 'brands'

export const BRANDS_EDITABLE_FIELDS: Record<string, string> = {
  'name': 'name',
  '브랜드코드': '브랜드코드',
  '담당자': '담당자',
  '연락처': '연락처',
  '이메일': '이메일',
  '파이프라인_단계': '파이프라인_단계',
  '계약_체결': '계약_체결',
  '계약체결일': '계약체결일',
  '웹사이트': '웹사이트',
  '배송_주소': '배송_주소',
}

export const BRANDS_COLUMNS = [
  { data: 'name',          title: 'name',          readOnly: false, width: 150, fieldType: 'text' as FieldType },
  { data: '브랜드코드',     title: '브랜드코드',     readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '담당자',         title: '담당자',         readOnly: false, width: 100, fieldType: 'text' as FieldType },
  { data: '연락처',         title: '연락처',         readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '이메일',         title: '이메일',         readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '파이프라인_단계', title: '파이프라인_단계', readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '계약_체결',      title: '계약_체결',      readOnly: false, width: 80,  fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '계약체결일',     title: '계약체결일',     readOnly: false, width: 110, fieldType: 'date' as FieldType,
    type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true },
  { data: '웹사이트',       title: '웹사이트',       readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '배송_주소',      title: '배송_주소',      readOnly: false, width: 200, fieldType: 'text' as FieldType },

  { data: 'created_at', title: '생성일시', readOnly: true, width: 160, fieldType: 'date' as FieldType, system: true },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BRANDS_COL_HEADERS: string[] = (BRANDS_COLUMNS as any[]).map((c) => c.title ?? '')

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

function transformBrandRow(item: BrandItem): BrandRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    name: str(item.name),
    브랜드코드: str(item.브랜드코드),
    담당자: str(item.담당자),
    연락처: str(item.연락처),
    이메일: str(item.이메일),
    파이프라인_단계: str(item.파이프라인_단계),
    계약_체결: boolFlag(item.계약_체결),
    계약체결일: dateOrEmpty(item.계약체결일),
    웹사이트: str(item.웹사이트),
    배송_주소: str(item.배송_주소),
  }
}

function brandsMergeRealtimeUpdate(
  prev: BrandRow,
  payloadNew: Record<string, unknown>,
): BrandRow {
  const n = payloadNew
  return {
    ...prev,
    name: n.name !== undefined ? str(n.name) : prev.name,
    브랜드코드: n.브랜드코드 !== undefined ? str(n.브랜드코드) : prev.브랜드코드,
    담당자: n.담당자 !== undefined ? str(n.담당자) : prev.담당자,
    연락처: n.연락처 !== undefined ? str(n.연락처) : prev.연락처,
    이메일: n.이메일 !== undefined ? str(n.이메일) : prev.이메일,
    파이프라인_단계: n.파이프라인_단계 !== undefined ? str(n.파이프라인_단계) : prev.파이프라인_단계,
    계약_체결: n.계약_체결 !== undefined ? boolFlag(n.계약_체결) : prev.계약_체결,
    계약체결일: n.계약체결일 !== undefined ? dateOrEmpty(n.계약체결일) : prev.계약체결일,
    웹사이트: n.웹사이트 !== undefined ? str(n.웹사이트) : prev.웹사이트,
    배송_주소: n.배송_주소 !== undefined ? str(n.배송_주소) : prev.배송_주소,
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const brandsPageConfig: PageConfig<BrandItem, BrandRow> = {
  pageKey: BRANDS_VIEW_PAGE_KEY,
  pageName: '브랜드',
  apiBase: '/api/brands',
  realtimeChannel: 'brands_changes',
  realtimeTable: 'flat_brands',
  selectOptionsTable: 'brands',
  columns: BRANDS_COLUMNS,
  colHeaders: BRANDS_COL_HEADERS,
  editableFields: BRANDS_EDITABLE_FIELDS,
  transformRow: transformBrandRow,
  mergeRealtimeUpdate: brandsMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: false },
  viewTypes: ['grid'],
  initialLoadPolicy: 'auto',
}
