// Products grid configuration.
//
// 이 파일 하나로 제품 관리 페이지가 완성된다 — 컬럼 카탈로그, API
// 베이스, 행 변환 / realtime 머지 함수만 정의하면 DataGrid 공통
// 컴포넌트가 나머지(HOT 마운트, 컬럼 순서, 필터/정렬/검색, undo/redo,
// 뷰 영속화, realtime 구독 셸)를 모두 처리한다.

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import {
  카테고리Renderer,
  개발현황Renderer,
  마감잠금Renderer,
  체류지Renderer,
} from './productsRenderers'
import type { ProductItem, ProductRow } from './productsTypes'

export const PRODUCTS_VIEW_PAGE_KEY = 'products'

// Row 필드명 → products 테이블 컬럼명. PATCH 엔드포인트가 허용하는
// 컬럼과 정확히 일치해야 한다. lookup(JOIN) / formula 컬럼(브랜드명,
// parent_여부, 가다번호_목록, 가다위치_목록, mold_개수, sample_개수,
// claim_개수)은 여기에 포함되지 않으므로 자동으로 read-only 처리.
export const PRODUCTS_EDITABLE_FIELDS: Record<string, string> = {
  '제품명': '제품명',
  '제품코드': '제품코드',
  'brand_id': 'brand_id',
  '카테고리': '카테고리',
  '발주_가능': '발주_가능',
  '제공_중단': '제공_중단',
  '개발_현황': '개발_현황',
  '기본_공임': '기본_공임',
  '추가금_도금': '추가금_도금',
  '추가금_sil': '추가금_sil',
  '추가금_wg': '추가금_wg',
  '추가금_yg': '추가금_yg',
  '추가금_rg': '추가금_rg',
  '제작_소요일': '제작_소요일',
  '기준_중량': '기준_중량',
  '체인_두께': '체인_두께',
  '마감_잠금': '마감_잠금',
  '검수_유의': '검수_유의',
  '작업지시서': '작업지시서',
  '체류지': '체류지',
  '파일_경로': '파일_경로',
  '개발_슬랙_링크': '개발_슬랙_링크',
  '개발_슬랙_id': '개발_슬랙_id',
  '슬랙_thread_id': '슬랙_thread_id',
  '원가_스톤세팅비': '원가_스톤세팅비',
  '원가_원자재비': '원가_원자재비',
  '원가_주물비': '원가_주물비',
  '원가_고정각인비': '원가_고정각인비',
  '원가_폴리싱비': '원가_폴리싱비',
  '원가_기타': '원가_기타',
  '원가_체인비': '원가_체인비',
  '원가_심플랩스': '원가_심플랩스',
}

// 컬럼 카탈로그. 섹션 구분은 주석으로만 표시 — 실제 렌더 순서는 이 배열
// 그대로.
export const PRODUCTS_COLUMNS = [
  // ── 식별 ────────────────────────────────────────────────────────────
  { data: '제품코드', title: '제품코드', readOnly: false, width: 120, fieldType: 'text' as FieldType },
  { data: '제품명',   title: '제품명',   readOnly: false, width: 220, fieldType: 'text' as FieldType },

  // ── 브랜드 연결 ────────────────────────────────────────────────────
  { data: '브랜드명', title: '브랜드',   readOnly: true,  width: 140, fieldType: 'text' as FieldType },

  // ── 기본 ───────────────────────────────────────────────────────────
  { data: '카테고리', title: '카테고리', readOnly: false, width: 100, fieldType: 'select' as FieldType, renderer: 카테고리Renderer },
  { data: '발주_가능', title: '발주 가능', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: '제공_중단', title: '제공 중단', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },
  { data: 'parent_여부', title: '부모 여부', readOnly: true, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── 개발 ───────────────────────────────────────────────────────────
  { data: '개발_현황', title: '개발 현황', readOnly: false, width: 130, fieldType: 'select' as FieldType, renderer: 개발현황Renderer },
  { data: '제작_소요일', title: '제작 소요일', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '기준_중량', title: '기준 중량', readOnly: false, width: 90, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '체인_두께', title: '체인 두께', readOnly: false, width: 90, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '마감_잠금', title: '마감/잠금', readOnly: false, width: 110, fieldType: 'select' as FieldType, renderer: 마감잠금Renderer },
  { data: '체류지',   title: '체류지',   readOnly: false, width: 100, fieldType: 'select' as FieldType, renderer: 체류지Renderer },

  // ── 공임 ───────────────────────────────────────────────────────────
  { data: '기본_공임', title: '기본 공임', readOnly: false, width: 90, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가금_도금', title: '추가금(도금)', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가금_sil', title: '추가금(SIL)', readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가금_wg',  title: '추가금(WG)',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가금_yg',  title: '추가금(YG)',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '추가금_rg',  title: '추가금(RG)',  readOnly: false, width: 100, fieldType: 'number' as FieldType, type: 'numeric' },

  // ── 원가 ───────────────────────────────────────────────────────────
  { data: '원가_스톤세팅비', title: '[원가] 스톤세팅비', readOnly: false, width: 130, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_원자재비',   title: '[원가] 원자재비',   readOnly: false, width: 120, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_주물비',     title: '[원가] 주물비',     readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_고정각인비', title: '[원가] 고정각인비', readOnly: false, width: 130, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_폴리싱비',   title: '[원가] 폴리싱비',   readOnly: false, width: 120, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_기타',       title: '[원가] 기타',       readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_체인비',     title: '[원가] 체인비',     readOnly: false, width: 110, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '원가_심플랩스',   title: '[원가] 심플랩스',   readOnly: false, width: 120, fieldType: 'number' as FieldType, type: 'numeric' },

  // ── 기타 ───────────────────────────────────────────────────────────
  { data: '검수_유의', title: '검수 유의', readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '작업지시서', title: '작업지시서', readOnly: false, width: 200, fieldType: 'longtext' as FieldType, type: 'text' },
  { data: '파일_경로', title: '파일 경로', readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '개발_슬랙_링크', title: '개발 슬랙 링크', readOnly: false, width: 180, fieldType: 'text' as FieldType },
  { data: '개발_슬랙_id',   title: '개발 슬랙 ID',   readOnly: false, width: 140, fieldType: 'text' as FieldType },
  { data: '슬랙_thread_id', title: '슬랙 Thread ID', readOnly: false, width: 140, fieldType: 'text' as FieldType },

  // JOIN 파생 — 읽기 전용. flat_products 에 물리 컬럼으로 저장되어 필터 가능.
  { data: '가다번호_목록', title: '가다번호',     readOnly: true, width: 120, fieldType: 'text'   as FieldType },
  { data: '가다위치_목록', title: '가다 위치',    readOnly: true, width: 120, fieldType: 'text'   as FieldType },
  { data: 'mold_개수',     title: '몰드 수',      readOnly: true, width: 80,  fieldType: 'number' as FieldType },
  { data: 'sample_개수',   title: '샘플 수',      readOnly: true, width: 80,  fieldType: 'number' as FieldType },
  { data: 'claim_개수',    title: '클레임 수',    readOnly: true, width: 80,  fieldType: 'number' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRODUCTS_COL_HEADERS: string[] = (PRODUCTS_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ───────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function boolFlag(v: unknown): boolean {
  return v === true
}

// ── Item → Row 변환 ──────────────────────────────────────────────────

function transformProductRow(item: ProductItem): ProductRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    제품코드: str(item.제품코드),
    제품명: str(item.제품명),
    brand_id: item.brand_id ?? null,
    브랜드명: str(item.브랜드명),
    카테고리: str(item.카테고리),

    발주_가능: boolFlag(item.발주_가능),
    제공_중단: boolFlag(item.제공_중단),
    개발_현황: str(item.개발_현황),

    기본_공임: numOrNull(item.기본_공임),
    추가금_도금: numOrNull(item.추가금_도금),
    추가금_sil: numOrNull(item.추가금_sil),
    추가금_wg: numOrNull(item.추가금_wg),
    추가금_yg: numOrNull(item.추가금_yg),
    추가금_rg: numOrNull(item.추가금_rg),

    제작_소요일: numOrNull(item.제작_소요일),
    기준_중량: numOrNull(item.기준_중량),
    체인_두께: numOrNull(item.체인_두께),
    마감_잠금: str(item.마감_잠금),
    검수_유의: str(item.검수_유의),
    작업지시서: str(item.작업지시서),
    체류지: str(item.체류지),

    파일_경로: str(item.파일_경로),
    개발_슬랙_링크: str(item.개발_슬랙_링크),
    개발_슬랙_id: str(item.개발_슬랙_id),
    슬랙_thread_id: str(item.슬랙_thread_id),

    원가_스톤세팅비: numOrNull(item.원가_스톤세팅비),
    원가_원자재비: numOrNull(item.원가_원자재비),
    원가_주물비: numOrNull(item.원가_주물비),
    원가_고정각인비: numOrNull(item.원가_고정각인비),
    원가_폴리싱비: numOrNull(item.원가_폴리싱비),
    원가_기타: numOrNull(item.원가_기타),
    원가_체인비: numOrNull(item.원가_체인비),
    원가_심플랩스: numOrNull(item.원가_심플랩스),

    parent_여부: boolFlag(item.parent_여부),
    가다번호_목록: str(item.가다번호_목록),
    가다위치_목록: str(item.가다위치_목록),
    mold_개수: numOrNull(item.mold_개수),
    sample_개수: numOrNull(item.sample_개수),
    claim_개수: numOrNull(item.claim_개수),
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────

// products 테이블 UPDATE 이벤트 수신 시, payload.new 에 들어오는 products
// 소유 컬럼만 현재 row에 덮어쓴다. JOIN 유래 파생 컬럼은 현재 row 값을
// 유지 — 이 값이 틀릴 수 있으나 DB 재조회 비용을 피한다. 일관성이
// 중요한 파생 컬럼이 생기면 실시간 머지 대신 refetch 경로로 전환.
function productsMergeRealtimeUpdate(
  prev: ProductRow,
  payloadNew: Record<string, unknown>,
): ProductRow {
  const n = payloadNew
  return {
    ...prev,
    제품코드: n.제품코드 !== undefined ? str(n.제품코드) : prev.제품코드,
    제품명: n.제품명 !== undefined ? str(n.제품명) : prev.제품명,
    brand_id: n.brand_id !== undefined ? (n.brand_id as string | null) : prev.brand_id,
    카테고리: n.카테고리 !== undefined ? str(n.카테고리) : prev.카테고리,
    발주_가능: n.발주_가능 !== undefined ? boolFlag(n.발주_가능) : prev.발주_가능,
    제공_중단: n.제공_중단 !== undefined ? boolFlag(n.제공_중단) : prev.제공_중단,
    개발_현황: n.개발_현황 !== undefined ? str(n.개발_현황) : prev.개발_현황,

    기본_공임: n.기본_공임 !== undefined ? numOrNull(n.기본_공임) : prev.기본_공임,
    추가금_도금: n.추가금_도금 !== undefined ? numOrNull(n.추가금_도금) : prev.추가금_도금,
    추가금_sil: n.추가금_sil !== undefined ? numOrNull(n.추가금_sil) : prev.추가금_sil,
    추가금_wg: n.추가금_wg !== undefined ? numOrNull(n.추가금_wg) : prev.추가금_wg,
    추가금_yg: n.추가금_yg !== undefined ? numOrNull(n.추가금_yg) : prev.추가금_yg,
    추가금_rg: n.추가금_rg !== undefined ? numOrNull(n.추가금_rg) : prev.추가금_rg,

    제작_소요일: n.제작_소요일 !== undefined ? numOrNull(n.제작_소요일) : prev.제작_소요일,
    기준_중량: n.기준_중량 !== undefined ? numOrNull(n.기준_중량) : prev.기준_중량,
    체인_두께: n.체인_두께 !== undefined ? numOrNull(n.체인_두께) : prev.체인_두께,
    마감_잠금: n.마감_잠금 !== undefined ? str(n.마감_잠금) : prev.마감_잠금,
    검수_유의: n.검수_유의 !== undefined ? str(n.검수_유의) : prev.검수_유의,
    작업지시서: n.작업지시서 !== undefined ? str(n.작업지시서) : prev.작업지시서,
    체류지: n.체류지 !== undefined ? str(n.체류지) : prev.체류지,

    파일_경로: n.파일_경로 !== undefined ? str(n.파일_경로) : prev.파일_경로,
    개발_슬랙_링크: n.개발_슬랙_링크 !== undefined ? str(n.개발_슬랙_링크) : prev.개발_슬랙_링크,
    개발_슬랙_id: n.개발_슬랙_id !== undefined ? str(n.개발_슬랙_id) : prev.개발_슬랙_id,
    슬랙_thread_id: n.슬랙_thread_id !== undefined ? str(n.슬랙_thread_id) : prev.슬랙_thread_id,

    원가_스톤세팅비: n.원가_스톤세팅비 !== undefined ? numOrNull(n.원가_스톤세팅비) : prev.원가_스톤세팅비,
    원가_원자재비: n.원가_원자재비 !== undefined ? numOrNull(n.원가_원자재비) : prev.원가_원자재비,
    원가_주물비: n.원가_주물비 !== undefined ? numOrNull(n.원가_주물비) : prev.원가_주물비,
    원가_고정각인비: n.원가_고정각인비 !== undefined ? numOrNull(n.원가_고정각인비) : prev.원가_고정각인비,
    원가_폴리싱비: n.원가_폴리싱비 !== undefined ? numOrNull(n.원가_폴리싱비) : prev.원가_폴리싱비,
    원가_기타: n.원가_기타 !== undefined ? numOrNull(n.원가_기타) : prev.원가_기타,
    원가_체인비: n.원가_체인비 !== undefined ? numOrNull(n.원가_체인비) : prev.원가_체인비,
    원가_심플랩스: n.원가_심플랩스 !== undefined ? numOrNull(n.원가_심플랩스) : prev.원가_심플랩스,

    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig 팩토리 ────────────────────────────────────────────────

export const productsPageConfig: PageConfig<ProductItem, ProductRow> = {
  pageKey: PRODUCTS_VIEW_PAGE_KEY,
  pageName: '제품 관리',
  apiBase: '/api/products',
  realtimeChannel: 'products_changes',
  realtimeTable: 'products',
  selectOptionsTable: 'products',
  columns: PRODUCTS_COLUMNS,
  colHeaders: PRODUCTS_COL_HEADERS,
  editableFields: PRODUCTS_EDITABLE_FIELDS,
  transformRow: transformProductRow,
  mergeRealtimeUpdate: productsMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // products는 날짜 스코프가 없어 기본 로딩 시 전체(1만+) 레코드가
  // 한 번에 들어오는 UX가 바람직하지 않다. 필터/검색이 설정되기 전에는
  // 비어 있도록 하고, 사용자가 조건을 지정하면 그때 조회한다.
  initialLoadPolicy: 'require-filter',
}
