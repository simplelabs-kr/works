# 새 페이지 추가 체크리스트

`features/{page}/`, `app/api/{page}/`, `app/works/{page}/`, `components/works/{Page}Grid.tsx`, `lib/nav/pages.ts` 를 건드린다. 총 10~11개 파일, ~500 라인. 이 중 대부분은 템플릿 복사 + sed.

---

## 역할 분담

**claude.ai (DB 전담 — Supabase MCP):**
flat 테이블 / 트리거 / RPC / 초기 bulk 적재 / field_options 등록

**Claude Code (앱 전담):**
TypeScript 코드 전부 — Config / Types / API route / Grid 컴포넌트 / 페이지

---

## STEP 1. DB 준비 (claude.ai)

1. 원본 테이블 구조 파악 — JOIN 대상 / 집계 컬럼 식별.
2. `flat_{table}` 테이블 생성. 원본 컬럼 + 파생 컬럼 + `deleted_at` / `created_at` / `updated_at`.
3. 인덱스:
   - GIN trgm 인덱스 (텍스트 검색용)
   - 주요 필터 컬럼 인덱스
4. `upsert_flat_{table}()` 함수.
5. 트리거:
   - 원본 테이블 INSERT/UPDATE/DELETE → upsert_flat 호출
   - JOIN 대상 테이블 변경 → 연관 flat 레코드 동기화
6. 초기 bulk 적재 (Python psycopg2 또는 MCP).
7. RPC 생성 — `search_{table}` / `count_{table}` 두 개 필요. 시그니처 고정:
   ```
   search_{table}(filters_json jsonb, sorts_json jsonb, search_term text,
                  result_offset int, result_limit int, trashed_only bool)
   count_{table}(filters_json jsonb, search_term text, trashed_only bool)
   ```
   - `filter_group_to_sql()` 공통 헬퍼 사용
   - `filters_json` 은 `RootFilterState {logic, conditions}` 객체 (bare array 아님)
   - 집계 컬럼 포함 모든 flat 컬럼을 WHERE 절에서 참조 가능해야 한다
     (numeric/boolean 은 `::text` 캐스팅으로 contains 지원)
8. `field_options` 테이블에 select 컬럼 옵션 등록.
9. 원본 테이블에 `deleted_at` 확인 — 없으면 추가.

---

## STEP 2. 앱 코드 (Claude Code)

### 2-1. `features/{page}/` — 복사

```
cp -r features/_template features/{page}
cd features/{page}
# _template → {page}, Template → {Page}, TEMPLATE → {PAGE} 로 일괄 치환
```

### 2-2. `features/{page}/{page}Types.ts`

- `Item` = flat_{table} raw shape. null 가능. field 이름은 flat_{table} 물리 컬럼명과 **정확히 일치**.
- `Row` = HOT display shape. transformRow 반환 타입.

### 2-3. `features/{page}/{page}Config.ts`

핵심 체크:

- [ ] `col.data` = flat_{table} 물리 컬럼명과 **정확히 일치**
- [ ] `col.title` = 사용자 레이블. **페이지 내 유일**해야 함
- [ ] 편집 가능 컬럼: `readOnly: false` + `EDITABLE_FIELDS` 등록
- [ ] JOIN / 집계 파생: `readOnly: true` + `EDITABLE_FIELDS` 미등록
- [ ] 집계 컬럼에 `filterable: false` **금지** — 표시되는 모든 컬럼은 필터 가능해야 한다
- [ ] 대규모 데이터는 `initialLoadPolicy: 'require-filter'`
- [ ] `pageKey` / `apiBase` / `realtimeChannel` / `realtimeTable` / `selectOptionsTable` 채움
- [ ] `transformRow` — null → '' 또는 null 또는 false 로 정규화
- [ ] `mergeRealtimeUpdate` — **편집 가능 필드만** 동기화. 파생 컬럼 건드리지 말 것
- [ ] 파생 컬럼이 다른 편집 필드에 의존하면 `recomputeDerivedAfterEdit` 구현

### 2-4. API 라우트 — 5개

`app/api/{page}/` 아래:

**`route.ts`** (9줄)
```ts
import { createListRoute } from '@/lib/api/createTableRoute'
export const maxDuration = 10
export const POST = createListRoute({
  searchRpc: 'search_{table}',
  countRpc:  'count_{table}',
  logPrefix: '[{page}]',
})
```

**`[id]/route.ts`** — FIELD_SPECS 는 스크립트로 생성
```ts
import { createPatchRoute, createSoftDeleteRoute, type FieldSpecs }
  from '@/lib/api/createTableRoute'
export const maxDuration = 10
// FIELD_SPECS 블록은 scripts/generate-field-specs.mjs 가 {page}Config.ts 의
// *_EDITABLE_FIELDS / *_COLUMNS 로부터 생성한다 — 수작업 편집 금지.
const FIELD_SPECS: FieldSpecs = {
  // 빈 placeholder 로 두고 아래 명령으로 채운다:
  //   node scripts/generate-field-specs.mjs {page} --write
}
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

**FIELD_SPECS 생성 (EDITABLE_FIELDS ↔ FIELD_SPECS 3중 동기화 자동화):**
```
node scripts/generate-field-specs.mjs {page}          # stdout 으로 미리보기
node scripts/generate-field-specs.mjs {page} --write  # route.ts 에 직접 반영
node scripts/generate-field-specs.mjs {page} --check  # CI 에서 드리프트 검사
```
- 매핑: `text`/`select`/`longtext` → text + 기본 maxLength(200/50/2000), `number`, `checkbox`, `date` 는 그대로.
- 컬럼 카탈로그에 `maxLength: N` 을 붙이면 해당 값이 반영된다.
- `readOnly:false` 인데 EDITABLE_FIELDS 미등록 → 경고.
- EDITABLE_FIELDS 에 있는데 COLUMNS 엔트리가 없는 키(API-only FK 등) 는
  기존 route.ts 의 라인을 보존한다.

**`bulk-delete/route.ts`** (8줄) / **`restore/route.ts`** / **`permanent-delete/route.ts`** 각각:
```ts
import { createBulkDeleteRoute }    from '@/lib/api/createTableRoute'
// 또는 createRestoreRoute, createPermanentDeleteRoute
export const maxDuration = 10
export const POST = createBulkDeleteRoute({
  table:     '{table}',
  logPrefix: '[{page}/bulk-delete]',
})
```

### 2-5. 프론트 페이지 — 2개

**`components/works/{Page}Grid.tsx`**
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

**`app/works/{page}/page.tsx`**
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

### 2-6. `lib/nav/pages.ts` — 한 줄

```ts
export const WORKS_PAGES: PageDef[] = [
  ...
  { key: '{page}', label: '{label}', href: '/works/{page}', status: 'active', presetKey: '{page}' },
]
```

### 2-7. 검증

```
npx tsc --noEmit       # 타입 통과
npm run lint            # 린트 통과
npm run dev             # 페이지 열어서 확인
```

체크:
- [ ] 빈 그리드로 열림 (initialLoadPolicy: require-filter 라면)
- [ ] 필터 추가하면 데이터 조회됨
- [ ] 모든 title 컬럼이 필터 선택지에 뜸
- [ ] 편집 가능 컬럼만 인라인 편집 가능
- [ ] realtime 업데이트 수신됨 (다른 탭에서 수정하면 반영)

---

## 최근 겪은 함정 (재발 방지)

1. **필터 "데이터 조회에 실패"** — `col.title != col.data` 인데 RPC 로 title 전송됨.
   → DataGrid 가 title→data 치환 중. 근본 치료 진행 중 (제안 D).
2. **filterable: false 남용** — 집계/파생 컬럼도 flat 테이블엔 물리 컬럼이라 필터 가능해야 한다.
   **모든 표시 컬럼은 필터 가능.**
3. **FIELD_SPECS 누락으로 PATCH 403** — EDITABLE_FIELDS 에는 있는데
   FIELD_SPECS 엔 없으면 "편집 불가 필드" 에러. 수동 동기화 필수 (제안 C 전까지).
4. **filters_json 을 bare array 로 전송** — 객체 `{logic, conditions}` 여야 함.
   createListRoute 헬퍼가 둘 다 허용하지만 RPC 측은 객체 기준으로 설계.
5. **numeric/boolean 에 contains 연산자** — DB 측 `::text` 캐스팅 없으면 에러.
   RPC 의 flat_condition_to_sql 에서 처리.
6. **No. / 체크박스 컬럼을 Config 에 추가** — DataGrid 가 자동 주입. 직접 넣으면 중복.
7. **대규모 테이블에 initialLoadPolicy 누락** — 기본 'auto' 로 10k+ 건 한 번에 로드.
