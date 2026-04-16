# SimpleLabs Works - Project Context & Architecture Rules

## 1. Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- UI Component: Handsontable (Data Grid)
- Backend: Next.js API Routes
- Database: Supabase (PostgreSQL) - Pro Plan (8GB RAM)

## 2. Core DB Architecture: "Denormalized Flat Table"
우리는 16만 건 이상의 주문 데이터를 0.1초 만에 검색하기 위해 무거운 JOIN을 피하고, 역정규화된 물리 테이블 방식을 사용합니다.
- Master Table: `flat_order_details` (여러 테이블이 평탄화된 단일 테이블)
- Sync Mechanism: `order_items`, `orders`, `products` 등의 원본 테이블에 Row-level 트리거가 걸려 있습니다.
- Upsert Function: 모든 트리거는 `upsert_flat_order_detail` 함수를 호출하여 Master Table을 갱신합니다.
- Search Optimization: 주요 텍스트 검색 컬럼에는 `GIN (trgm)` 인덱스가 걸려 있습니다.

## 3. API & Frontend Rules
- API Route: 복잡한 `JOIN`은 금지되며, 데이터 조회는 오직 `SELECT * FROM flat_order_details` 단일 테이블에서만 수행합니다.
- Pagination: 전체 개수를 세는 `COUNT(*)` 쿼리는 지양하며, 화면(WorksGrid)은 100건 단위의 무한 스크롤(Infinite Scroll)로 구현합니다.

## 4. Maintenance Manual: 새로운 컬럼 추가 시 3단계
1. 원본 테이블 수정: `ALTER TABLE [원본] ADD COLUMN [새_컬럼];`
2. Master 테이블 수정: `ALTER TABLE flat_order_details ADD COLUMN [새_컬럼];`
3. 공통 함수 갱신: `upsert_flat_order_detail` 함수에 새 컬럼 추가 후 덮어쓰기.

## 5. AI Anti-Patterns (절대 금지 사항)
- Materialized View 사용 금지 (OLTP 환경 과부하 방지)
- 대용량 데이터 이관 시 네트워크를 경유한 Python/REST API 스크립트 지양 (DB 내부 PL/pgSQL 또는 Direct Connection 우선 사용)

## 6. 역할 분담 원칙

### Supabase DB 작업
- RPC 함수 생성/수정, 트리거 함수 수정, 스키마 변경(컬럼 추가/삭제), 마이그레이션
- **claude.ai(상륜님과 대화 중인 Claude)가 전담**
- Claude Code는 DB 작업 절대 직접 수행 금지
- DB 수정이 필요한 경우 "이 작업은 DB 변경이 필요합니다. claude.ai에서 처리해주세요"라고 안내만 할 것

### 코드 작업
- Next.js 코드, API 라우트, 컴포넌트, CSS 등
- **Claude Code가 전담**
