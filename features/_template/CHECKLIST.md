# 신규 페이지 생성 체크리스트

총 10~11 파일, ~500 라인. 대부분 템플릿 복사 + sed 로 해결된다. 핵심은
**Step 0 (아키텍처 결정)** — 이걸 건너뛰면 뒤에서 다 부서진다.

---

## 역할 분담

**claude.ai (DB 전담 — Supabase MCP):**
스키마 / flat 테이블 / 트리거 / RPC / 초기 bulk 적재 / field_options 등록

**Claude Code (앱 전담):**
TypeScript 코드 전부 — Config / Types / API route / Grid / 페이지 / 네비

Claude Code 는 DB 변경 **직접 수행 금지**. 필요하면 "claude.ai 에서
처리해주세요" 로 안내만.

---

## STEP 0. 원칙

**모든 페이지 = Flat table 패턴 (Case A).** 예외 없음 — 단순 마스터 데이터도
일관성을 위해 flat 구조로 통일한다. (이전에 존재하던 Case B / 직접 JOIN
패턴은 제거되었다.)

---

## Flat table 방식

### DB 준비 (claude.ai)

- [ ] 소스 테이블 FK 정리 — UUID 컬럼 + 인덱스 + airtable_id 기반 백필
- [ ] `deleted_at` 컬럼 확인 (없으면 추가)
- [ ] `flat_{table}` 테이블 생성
  - 원본 컬럼 + 파생 컬럼(lookup/rollup) + FK UUID 컬럼
  - `deleted_at` / `created_at` / `updated_at`
- [ ] 인덱스
  - GIN trigram (텍스트 검색 대상 컬럼)
  - 주요 필터/정렬 컬럼 인덱스
- [ ] `upsert_flat_{table}()` 함수
  - **Lookup 컬럼**: JOIN 으로 가져와 저장
  - **Rollup 컬럼**: 집계 계산 후 저장
  - **Formula 컬럼**: **저장하지 않음** → 프론트에서 `derived: true` 로 처리
- [ ] 트리거
  - 원본 테이블 INSERT/UPDATE/DELETE → upsert 호출
  - JOIN 대상 테이블 변경 → 연관 flat 레코드 동기화
    (예: `brands` 변경 → `flat_products` 의 브랜드명 동기화)
- [ ] 초기 bulk 적재 (PL/pgSQL 또는 Python psycopg2) + 건수 검증
- [ ] RPC — 시그니처 고정
  ```
  search_flat_{table}(filters_json jsonb, sorts_json jsonb, search_term text,
                      result_offset int, result_limit int,
                      trashed_only boolean DEFAULT false)
  count_flat_{table}(filters_json jsonb, search_term text,
                     trashed_only boolean DEFAULT false)
  ```
  - `filter_group_to_sql()` 공통 헬퍼 사용
  - `filters_json` 은 `RootFilterState {logic, conditions}` 객체 (bare array 아님)
  - 모든 flat 컬럼을 WHERE 절에서 참조 가능해야 한다
    (numeric/boolean 은 `::text` 캐스팅으로 contains 지원)
- [ ] `field_options` 에 select 컬럼 옵션 등록
- [ ] Realtime publication 에 `flat_{table}` 추가 + `REPLICA IDENTITY FULL`
- [ ] **신규 테이블인 경우**: 고유번호 자동생성 트리거
  (포맷: 접두사 + YYMMDDHHMI + 4자리 hex)
- [ ] **생성일시 처리** (마이그레이션 완료 전까지): `DEFAULT now()` +
  INSERT 트리거로 자동 설정 (임시). 최종 마이그레이션 완료 후엔 `created_at`
  으로 대체하고 임시 컬럼 삭제.

### 앱 코드 (Claude Code)

#### 1. `features/{page}/` 생성

**방법 A — 스키마 기반 자동 생성 (권장)**

claude.ai 에서 flat 테이블 컬럼 메타를 뽑아 JSON 전달:

```sql
SELECT column_name, data_type, udt_name,
       character_maximum_length, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'flat_{table}'
ORDER  BY ordinal_position;
```

```
node scripts/generate-page-config.mjs {page} --schema schema.json --write
```

휴리스틱:
- UUID FK(`*_id`), `id`/`created_at`/`updated_at`/`deleted_at`, `jsonb` → 카탈로그 제외
- `_목록$` / `_개수$` / `_여부$` → `readOnly: true` (집계/파생)
- FK root 에 대응되는 영어 name 컬럼(`brand_id` + 영어 name) → `readOnly: true`
- 한국어 name 컬럼(`브랜드명` 등) 은 자동 추정 불가 → **작가가 수동으로
  `readOnly: true` + `EDITABLE_FIELDS` 에서 제거**

생성 후 작가가 라벨/폭/렌더러/select 옵션을 다듬는다.
**다듬은 후엔 재생성 금지** — 수동 편집 유실.

**방법 B — 템플릿 복사 (수동)**

```
cp -r features/_template features/{page}
cd features/{page}
# _template → {page}, Template → {Page}, TEMPLATE → {PAGE} 로 일괄 치환
```

#### 2. `features/{page}/{page}Types.ts`

- `Item` = `flat_{table}` raw shape. null 가능. field 이름은 flat 테이블
  물리 컬럼명과 **정확히 일치**.
- `Row` = HOT display shape. `transformRow` 반환 타입.
- FK UUID 컬럼(`*_id`)은 `Row` 에 **포함** — 링크 기능에 필요.
  단 `COLUMNS` 카탈로그에서는 제외 (그리드에 표시 불필요).

#### 3. `features/{page}/{page}Config.ts`

핵심 체크:
- [ ] `col.data` = `flat_{table}` 물리 컬럼명과 **정확히 일치**
- [ ] `col.title` = 사용자 레이블. **페이지 내 유일**해야 함
- [ ] 편집 가능 컬럼: `readOnly: false` + `EDITABLE_FIELDS` 등록
- [ ] JOIN/집계 파생: `readOnly: true` + `EDITABLE_FIELDS` 미등록
- [ ] Formula 파생: `derived: true` + `readOnly: true` + `renderer` 지정
- [ ] Select 컬럼: `renderer` 필수 (chevron 표시용, `productsRenderers` 패턴)
- [ ] Linklist 컬럼 (chip UI — 정방향/역방향 공통):
      `fieldType: 'linklist'` + `editor: false` + `renderer: linkListRenderer`
      + `linkListConfig: { linkTable, fkColumn, displayField, searchFields,
      secondaryField?, maxLinks?, cacheField? }`
      - 정방향 (N=1): `maxLinks: 1`. 현재 row 의 FK 를 PATCH.
      - 역방향 (N≥0): `maxLinks` 미지정 + `readOnly: true`.
        flat_{table} 의 JSONB 캐시 컬럼을 그대로 렌더. add/remove 는
        상대 row 의 FK 를 PATCH (트리거가 캐시 재계산).
- [ ] 집계 컬럼에 `filterable: false` **금지** — 표시되는 모든 컬럼은 필터 가능
- [ ] 대규모 데이터는 `initialLoadPolicy: 'require-filter'`
- [ ] `pageKey` / `apiBase` / `realtimeChannel` / `realtimeTable` /
      `selectOptionsTable` 채움 (`realtimeTable` = `flat_{table}`)
- [ ] `transformRow` — null → `''` / null / false 정규화
- [ ] `mergeRealtimeUpdate` — flat 테이블 UPDATE 페이로드의 모든 컬럼
      (JOIN denormalized, JSONB 캐시 포함) 을 동기화
- [ ] 파생 컬럼이 다른 편집 필드에 의존하면 `recomputeDerivedAfterEdit` 구현

#### 4. `features/{page}/{page}Renderers.ts`

select 컬럼마다 renderer 정의 (chevron 표시 + `data-select-col` dataset 세팅).
`features/products/productsRenderers.ts` 팩토리 패턴 그대로 복사.

#### 5. API 라우트 — 5개

`app/api/{page}/route.ts` (9줄)
```ts
import { createListRoute } from '@/lib/api/createTableRoute'
export const maxDuration = 10
export const POST = createListRoute({
  searchRpc: 'search_flat_{table}',
  countRpc:  'count_flat_{table}',
  logPrefix: '[{page}]',
})
```

`app/api/{page}/[id]/route.ts` — FIELD_SPECS 는 COLUMNS + EDITABLE_FIELDS 에서 파생
```ts
import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { {PAGE}_COLUMNS, {PAGE}_EDITABLE_FIELDS } from '@/features/{page}/{page}Config'

export const maxDuration = 10

// FIELD_SPECS 는 Config 의 COLUMNS + EDITABLE_FIELDS 로부터 파생.
// 수작업 유지 금지. COLUMNS 에 없는 orphan 편집 키 (FK UUID 등)는 overrides 로 명시.
const FIELD_SPECS = deriveFieldSpecs({
  columns: {PAGE}_COLUMNS as readonly SpecColumnLike[],
  editableFields: {PAGE}_EDITABLE_FIELDS,
  // overrides: { product_id: { type: 'text', maxLength: 64 } },
  page: '{page}',
})

// PATCH 는 원본 테이블 직접 업데이트 (flat 테이블이 아님 — 트리거가 동기화).
export const PATCH = createPatchRoute({
  table:      '{table}',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[{page}]',
})
export const DELETE = createSoftDeleteRoute({
  table:     '{table}',
  logPrefix: '[{page}]',
})
```

**FIELD_SPECS 파생 규칙:**
- `text` / `select` / `longtext` → text + 기본 maxLength (200/50/2000)
- `number` / `checkbox` / `date` / `attachment` 는 타입 그대로
- COLUMNS 항목에 `maxLength: N` 을 붙이면 그 값이 쓰인다 (SSoT)
- select 컬럼에 `enumValues: [...]` 가 있으면 enum 검증
- EDITABLE_FIELDS 에 있는데 COLUMNS 엔트리도 없고 overrides 에도 없으면
  모듈 로드 시 즉시 throw — 드리프트 조기 감지

**중요 — PATCH body shape:** `createPatchRoute` 는 `{ field, value }` 단일
필드 계약. Link 컬럼처럼 내부적으로 PATCH 호출할 때 절대 `{ [fkColumn]: id }`
형태로 보내지 말 것 (→ `field === undefined` → 403 "편집 불가 필드").

`bulk-delete/route.ts` / `restore/route.ts` / `permanent-delete/route.ts`
각각 8줄 — `createBulkDeleteRoute` / `createRestoreRoute` /
`createPermanentDeleteRoute` 사용.

#### 6. 프론트 페이지 — 2개

`components/works/{Page}Grid.tsx`
```tsx
'use client'
import DataGrid from '@/components/datagrid/DataGrid'
import { {page}PageConfig } from '@/features/{page}/{page}Config'
import { useRemountVersion } from '@/lib/works/remountBus'
export default function {Page}Grid() {
  const v = useRemountVersion({page}PageConfig.pageKey)
  return <DataGrid key={v} pageConfig={​{page}PageConfig} />
}
```

`app/works/{page}/page.tsx`
```tsx
import dynamic from 'next/dynamic'
const {Page}Grid = dynamic(() => import('@/components/works/{Page}Grid'), {
  ssr: false,
  loading: () => <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>,
})
export default function {Page}Page() {
  return <div className="h-full min-h-0 overflow-hidden"><{Page}Grid /></div>
}
```

#### 7. `lib/nav/pages.ts` — 한 줄

```ts
{ key: '{page}', label: '{label}', href: '/works/{page}', status: 'active', presetKey: '{page}' },
```

---

## 컬럼 타입별 처리

| Airtable 타입 | Works 처리 |
|-------------|-----------|
| Lookup      | flat 테이블 또는 JOIN 에 저장 |
| Rollup      | flat 테이블 또는 JOIN 에 집계 저장 |
| Formula     | `derived: true` (프론트 계산, DB 저장 X) |
| Select      | `field_options` 등록 + Renderer 필수 |
| Link 정방향 | `fieldType: 'linklist'` + `maxLinks: 1` + linkListConfig (fkColumn / linkTable / displayField / searchFields) |
| Link 역방향 | `fieldType: 'linklist'` (maxLinks 미지정) + `readOnly: true`. flat_{table} 에 JSONB 캐시 컬럼 + 트리거로 동기화 |
| Checkbox    | 기본 타입 그대로 |
| Date        | 기본 타입 그대로 |
| Attachment  | 기본 타입 그대로 |

### FK UUID 컬럼 취급
- `{page}Types.ts` 의 `Row` 에는 **포함** (링크 편집에 필요)
- `COLUMNS` 카탈로그에서는 **제외** (그리드 표시 불필요)
- `EDITABLE_FIELDS` 에 등록 + `deriveFieldSpecs` overrides 로 타입 명시

### Realtime
- 구독 대상: `flat_*` 테이블 (source 테이블 X)
- `REPLICA IDENTITY FULL` 필수
- 역방향 linklist 가 있는 flat 테이블은 JSONB 캐시 컬럼이 트리거로
  갱신되므로 realtime 로 UI 반영 가능

### 생성일시
- 마이그레이션 완료 전: 임시 컬럼 유지, `readOnly: true`
- 최종 마이그레이션 후: `created_at` 으로 대체, 임시 컬럼 삭제

---

## 검증

```
npx tsc --noEmit     # 타입 통과
npm run lint         # 린트 통과
npm run dev          # 페이지 열어서 확인
```

브라우저 체크:
- [ ] 빈 그리드로 열림 (initialLoadPolicy: 'require-filter' 인 경우)
- [ ] 필터 추가하면 데이터 조회됨
- [ ] 모든 title 컬럼이 필터 선택지에 뜸
- [ ] Select 컬럼 chevron 표시
- [ ] Select 옵션 관리 모달 (⚙) 로 색상/순서 편집 가능
- [ ] Link 컬럼 클릭 → 검색 팝오버 → 선택 시 optimistic 업데이트
- [ ] 편집 가능 컬럼만 인라인 편집 가능
- [ ] realtime 업데이트 수신 (다른 탭에서 수정 시 반영)

---

## 최근 겪은 함정 (재발 방지)

1. **필터 "데이터 조회에 실패"** — `col.title != col.data` 인데 RPC 로 title 전송.
   DataGrid 가 title→data 치환 중. 가능하면 `title === data` 로 맞춰 회피.
2. **`filterable: false` 남용** — 집계/파생 컬럼도 flat 에선 물리 컬럼.
   **모든 표시 컬럼은 필터 가능해야 한다.**
3. **FIELD_SPECS 드리프트** — 수작업 유지 금지.
   `deriveFieldSpecs()` 가 COLUMNS + EDITABLE_FIELDS 에서 파생, 드리프트면
   모듈 로드 시 throw. orphan 키는 `overrides` 로 선언.
4. **`filters_json` bare array 로 전송** — 객체 `{logic, conditions}` 여야 함.
5. **numeric/boolean 에 contains** — DB 측 `::text` 캐스팅 없으면 에러.
   RPC 의 `flat_condition_to_sql` 에서 처리.
6. **No. / 체크박스 컬럼을 Config 에 추가** — DataGrid 가 자동 주입. 중복됨.
7. **대규모 테이블에 `initialLoadPolicy` 누락** — 기본 `'auto'` 로 10k+ 한 번에 로드.
8. **Link 컬럼 PATCH body 오배송** — `createPatchRoute` 는 `{ field, value }`
   계약. `{ [fkColumn]: id }` 로 보내면 `field === undefined` → 403.
9. **Select chevron 누락** — renderer 가 `td.dataset.selectCol = 'true'` 를
   세팅하지 않으면 CSS 의 `::after` chevron 이 안 그려짐.
   `renderSelectBadge(td, v, bg, true)` 사용.
10. **FK UUID 를 COLUMNS 에 넣음** — 사용자에게 의미 없는 UUID 가 그리드에 노출.
    `Row` 타입엔 포함하되 `COLUMNS` 카탈로그엔 넣지 말 것.
