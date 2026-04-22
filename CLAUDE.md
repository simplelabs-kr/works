# SimpleLabs Works - Project Context & Architecture Rules

## 1. Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- UI Component: Handsontable (Data Grid)
- Backend: Next.js API Routes
- Database: Supabase (PostgreSQL) - Pro Plan (8GB RAM)

## 2. Works 페이지 아키텍처 표준

### 핵심 원칙: 모든 페이지 = flat table 패턴

Works 의 모든 페이지(=테이블)는 예외 없이 flat table 기반으로 구현한다.
단순한 마스터 데이터 페이지도 동일하게 적용한다 (일관성 우선).

### flat table 구조

각 원본 테이블 → `flat_{table}` 물리 테이블:
- 원본 테이블의 모든 컬럼 포함
- JOIN 으로 가져오는 파생 컬럼 포함 (브랜드명, 집계 컬럼 등)
- `deleted_at`, `created_at`, `updated_at` 포함
- GIN trgm 인덱스 (텍스트 검색용)
- 주요 필터 컬럼 인덱스

트리거:
- 원본 테이블 INSERT/UPDATE/DELETE → `upsert_flat_{table}()` 호출
- JOIN 대상 테이블 변경 → 연관 flat 레코드 동기화
  (예: `brands` 변경 → `flat_products` 의 브랜드명 동기화)

### ⚠️ 컬럼 추가/변경 시 필수 체크리스트 (claude.ai 담당)

원본 테이블에 컬럼 추가 또는 변경 시:
1. `flat_{table}` 테이블에도 동일 컬럼 추가
2. `upsert_flat_{table}()` 함수에 해당 컬럼 추가
3. `ON CONFLICT DO UPDATE SET` 절에도 추가
4. 해당 컬럼을 참조하는 다른 flat 테이블도 확인 후 반영
   (예: `products.제품명` 변경 → `flat_products` 에도 반영)
5. `resolve_col_expr()` 에 컬럼 alias 필요 시 추가

### 새 페이지 추가 표준 절차

**claude.ai 담당 (DB):**
1. 원본 테이블 구조 파악 (JOIN 대상, 집계 컬럼 등)
2. `flat_{table}` 테이블 생성
3. 인덱스 생성 (GIN trgm + 주요 필터 컬럼)
4. `upsert_flat_{table}()` 함수 생성
5. 트리거 생성 (원본 + JOIN 대상 테이블들)
6. 초기 데이터 bulk 적재 (Python psycopg2)
7. `search_{table}` / `count_{table}` RPC 생성
   - `flat_{table}` 기반으로 조회
   - `filter_group_to_sql()` 사용
   - `filters_json`: `RootFilterState {logic, conditions}` 형태
8. `field_options` 등록 (select 컬럼 옵션)
9. `deleted_at` 컬럼 확인 (없으면 추가)

**Claude Code 담당 (앱):**
1. `features/{page}/{page}Config.ts` 생성
   - `COLUMNS`: `col.data` 는 flat 테이블 컬럼명과 정확히 일치
   - `col.title` 과 `col.data` 가 다를 경우 FilterModal 에서 `title` 기준으로 필터됨
   - 그리드에 표시되는 모든 컬럼은 필터링 가능해야 함 (예외 없음)
   - `initialLoadPolicy`: 데이터 규모 크면 `'require-filter'`
   - `editableFields`: lookup/집계 컬럼 제외
2. `features/{page}/{page}Types.ts`
3. `components/works/{Page}Grid.tsx`
4. `app/works/{page}/page.tsx`
5. `app/api/{page}/route.ts` (`createTableRoute` 헬퍼 사용, 5~10줄)
6. `app/api/{page}/[id]/route.ts`
7. `lib/nav/pages.ts` 에 페이지 등록

### products 작업에서 배운 것들 (재발 방지)

- **filters_json 계약**: `RootFilterState {logic, conditions}` 객체 형태.
  bare array 아님. `filter_group_to_sql()` 사용.
- **FilterModal 은 `col.title` 을 key 로 저장함.**
  `col.data` 와 일치하도록 `title` 을 정의하거나, 향후 FilterModal 을
  `col.data` 기반으로 전환 예정.
- **집계 컬럼 (`mold_개수` 등)**: 원본 테이블 기준 WHERE 절에서는 직접 참조 불가지만,
  flat table 에 일반 컬럼으로 저장되어 있으므로 필터링 가능 — 모든 표시 컬럼은 필터 가능해야 한다.
- **numeric / boolean 컬럼에 `contains` 연산자 사용 불가.**
  `flat_condition_to_sql` 에서 `::text` 캐스팅으로 처리됨.
- **No. / 체크박스 컬럼은 DataGrid 가 자동 주입** — Config 에 추가 불필요.

### 템플릿

`features/_template/` 디렉토리에 스캐폴드 + CHECKLIST.md 가 있다.
새 페이지는 이 디렉토리를 `features/{page}/` 로 복사하고 `_template` →
`{page}` 로 일괄 치환한 뒤 CHECKLIST.md 단계대로 진행한다. 실제 예시는
`features/products/` 참고.

## derived: true — first-class 패턴

`flat_{table}` 에 물리 컬럼이 없는 표시 컬럼은 `derived: true` 로 표시한다.
이는 임시 플래그가 아니라 "이 컬럼은 DB 필터/정렬 경로 밖에 있다" 라는
명시적 계약이다.

**사용 조건 (모두 충족 필요):**
- `readOnly: true` — 편집 불가 (편집하려면 flat 컬럼이 필요)
- `renderer` 지정 — 값은 다른 컬럼/외부 소스에서 렌더 시점에 조합
- `EDITABLE_FIELDS` 에 미등록 — PATCH 대상 아님

**런타임 효과 (자동):**
- FilterModal / SortModal 드롭다운에서 제외 (DB 레벨 필터/정렬 불가)
- DataGrid realtime merge 에서 건드리지 않음 — 페이지가 별도 경로로 주입

**대표 예시 (worksConfig):**
- `원부자재` — 별도 원부자재 발주 상태 계산기에서 주입
- `발주_현황` — 발주서 상태 렌더러에서 조합

물리 컬럼으로 승격할 수 있으면(비용 대비 이득이 있으면) 승격하되,
렌더러에서만 의미 있는 계산(복잡한 aggregation, external API 연동 등)
은 `derived: true` 를 유지한다.

## 3. API & Frontend Rules

- **API Route**: 복잡한 `JOIN` 은 금지. 데이터 조회는 `flat_{table}` 단일 테이블에서만 수행한다.
- **API Route 공통화**: `lib/api/createTableRoute.ts` 의 팩토리를 사용.
  RPC 이름 / 테이블 / 필드 스펙만 주입하면 된다 — 직접 핸들러 작성 금지.
- **Pagination**: 전체 개수 `COUNT(*)` 대신 `count_{table}` RPC 를 사용하고,
  그리드는 100건 단위 무한 스크롤.

## 4. AI Anti-Patterns (절대 금지 사항)

- Materialized View 사용 금지 (OLTP 환경 과부하 방지)
- 대용량 데이터 이관 시 네트워크를 경유한 Python / REST API 스크립트 지양
  (DB 내부 PL/pgSQL 또는 Direct Connection 우선 사용)

## 5. 역할 분담 원칙

### Supabase DB 작업
- RPC 함수 생성/수정, 트리거 함수 수정, 스키마 변경(컬럼 추가/삭제), 마이그레이션
- **claude.ai(상륜님과 대화 중인 Claude)가 전담**
- Claude Code 는 DB 작업 절대 직접 수행 금지
- DB 수정이 필요한 경우 "이 작업은 DB 변경이 필요합니다. claude.ai 에서 처리해주세요" 라고 안내만 할 것

### 코드 작업
- Next.js 코드, API 라우트, 컴포넌트, CSS 등
- **Claude Code 가 전담**
