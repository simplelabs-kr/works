// TEMPLATE — 새 페이지 Config.
//
// 한 파일로 페이지 하나가 완성된다. DataGrid 공통 컴포넌트가 HOT 마운트 /
// 컬럼 순서 / 필터·정렬·검색 / undo·redo / 뷰 영속화 / realtime 구독을
// 전부 처리하므로, 여기에는 (1) 컬럼 카탈로그, (2) API 베이스, (3) Item→Row
// 변환, (4) realtime merge 만 정의하면 된다.
//
// ⚠️ 암묵적 계약 — 어기면 런타임에 조용히 깨진다. CHECKLIST.md 참고.
//   - `col.data` 는 flat_{table} 의 물리 컬럼명과 정확히 일치
//   - `col.title` 은 사용자에게 보이는 레이블 — 중복 금지
//   - `readOnly: false` 컬럼은 EDITABLE_FIELDS 에 등록. route.ts 의
//     FIELD_SPECS 는 이 둘로부터 deriveFieldSpecs() 로 자동 파생 —
//     손으로 유지할 필요 없음.
//   - JOIN/집계 파생 컬럼은 `readOnly: true`, EDITABLE_FIELDS 에 미등록
//   - 대규모 데이터 페이지는 `initialLoadPolicy: 'require-filter'`

import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { TemplateItem, TemplateRow } from './_templateTypes'

export const TEMPLATE_VIEW_PAGE_KEY = 'template'

// Row 필드명 → {table} 테이블 컬럼명. PATCH 엔드포인트가 허용하는
// 컬럼과 정확히 일치해야 한다. JOIN / 집계 파생 컬럼은 여기에 포함되지
// 않으므로 자동으로 read-only 처리.
export const TEMPLATE_EDITABLE_FIELDS: Record<string, string> = {
  // TODO: 실제 편집 가능한 컬럼으로 교체
  '제목': '제목',
  '수량': '수량',
  '활성': '활성',
}

// 컬럼 카탈로그. 섹션 주석은 그룹핑용 — 실제 렌더 순서는 이 배열 그대로.
export const TEMPLATE_COLUMNS = [
  // ── 식별 / 편집 가능 ─────────────────────────────────────────────
  { data: '제목', title: '제목', readOnly: false, width: 220, fieldType: 'text' as FieldType },
  { data: '수량', title: '수량', readOnly: false, width: 90, fieldType: 'number' as FieldType, type: 'numeric' },
  { data: '활성', title: '활성', readOnly: false, width: 80, fieldType: 'checkbox' as FieldType, editor: false, renderer: checkboxRenderer },

  // ── JOIN / 집계 파생 — readOnly: true ─────────────────────────────
  // flat_{table} 에 물리 컬럼으로 저장되어 필터·정렬 가능.
  // EDITABLE_FIELDS 에는 넣지 않는다.
  { data: 'category_name', title: '카테고리', readOnly: true, width: 120, fieldType: 'lookup' as FieldType },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEMPLATE_COL_HEADERS: string[] = (TEMPLATE_COLUMNS as any[]).map((c) => c.title ?? '')

// ── 유틸 ───────────────────────────────────────────────────────────

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

function transformTemplateRow(item: TemplateItem): TemplateRow {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,

    // TODO: 실제 컬럼
    제목: str(item.제목),
    수량: numOrNull(item.수량),
    활성: boolFlag(item.활성),

    category_name: str(item.category_name),
  }
}

// ── Realtime UPDATE 머지 ─────────────────────────────────────────────
//
// {table} UPDATE 이벤트 수신 시, payload.new 의 소유 컬럼만 현재 row
// 에 덮어쓴다. JOIN/집계 파생 컬럼은 현재 값을 유지. 파생 컬럼 일관성
// 이 중요한 경우엔 realtime merge 대신 refetch 경로로 전환.
function templateMergeRealtimeUpdate(
  prev: TemplateRow,
  payloadNew: Record<string, unknown>,
): TemplateRow {
  const n = payloadNew
  return {
    ...prev,
    // TODO: EDITABLE_FIELDS 의 컬럼만 동기화. 파생 컬럼은 건드리지 않는다.
    제목: n.제목 !== undefined ? str(n.제목) : prev.제목,
    수량: n.수량 !== undefined ? numOrNull(n.수량) : prev.수량,
    활성: n.활성 !== undefined ? boolFlag(n.활성) : prev.활성,

    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

// ── PageConfig 팩토리 ────────────────────────────────────────────────

export const templatePageConfig: PageConfig<TemplateItem, TemplateRow> = {
  pageKey: TEMPLATE_VIEW_PAGE_KEY,
  pageName: '템플릿 페이지',          // TODO
  apiBase: '/api/template',            // TODO — `/api/{page}`
  realtimeChannel: 'template_changes', // TODO — 고유 채널명
  realtimeTable: 'flat_template',      // TODO — flat_{table} 로 지정 (JOIN 파생 컬럼 realtime 전파)
  selectOptionsTable: 'template',      // TODO — field_options.table_name
  columns: TEMPLATE_COLUMNS,
  colHeaders: TEMPLATE_COL_HEADERS,
  editableFields: TEMPLATE_EDITABLE_FIELDS,
  transformRow: transformTemplateRow,
  mergeRealtimeUpdate: templateMergeRealtimeUpdate,
  groupBy: {
    enabled: true,
    allowedTypes: ['select', 'checkbox'],
    defaultColumn: undefined,
  },
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // 데이터 규모가 크면 'require-filter' 로 둔다.
  initialLoadPolicy: 'require-filter',
}
