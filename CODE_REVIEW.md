# Code Review — SimpleLabs Works

**리뷰 범위**: `components/works/WorksGrid.tsx`, `app/api/**/*.ts`, `app/globals.css`
**브랜치**: `feature/code-review`
**기준 커밋**: `7a439db` (main)
**리뷰어 관점**: Claude Opus 4.7 (아키텍처 / 보안 / 성능 / 안정성)

---

## Critical (즉시 조치 권장)

### C1. 디버그 telemetry fetch가 프로덕션 코드에 하드코딩됨
- **파일**: `components/works/WorksGrid.tsx:723` 근처 (`#region agent log`)
- **문제**: `fetch('http://127.0.0.1:7939/ingest/002c7475-...')` 호출이 소스에 남아있음. 로컬 IP 엔드포인트이므로 엔드유저 브라우저에서는 조용히 실패하지만, 외부 호스트로 나가게 되면 이벤트/에러 payload가 외부로 유출될 수 있고, 세션 ID(`002c7475-...`)가 공개 번들에 노출됨. `dist/.next` 번들에 포함되는 순간 레포지토리의 "사적인 개발 세션"도 공개된다.
- **수정 방향**:
  - 해당 `#region agent log` 전체 블록 제거 또는 `if (process.env.NODE_ENV !== 'production')` 가드.
  - 가능하면 `NEXT_PUBLIC_DEBUG_INGEST_URL` 같은 env 변수로 빼서 빌드시 자동 제거되게.

### C2. 모든 API 라우트에 인증/인가가 없음
- **파일**:
  - `app/api/order-items/route.ts` (POST 조회)
  - `app/api/order-items/[id]/route.ts` (PATCH 편집)
  - `app/api/order-items/bulk-delete/route.ts` (POST soft delete)
  - `app/api/order-items/restore/route.ts` (POST 복구)
  - `app/api/upload/route.ts` (POST 파일 업로드)
  - `app/api/brands/route.ts`, `app/api/holidays/route.ts` (GET)
  - `app/api/user-view-settings/route.ts` (GET/POST — `user_key`가 body/query로 들어옴)
- **문제**: 익명 사용자가 URL만 알면 모든 주문 데이터를 읽고/수정/삭제/복구하고, Supabase Storage에 파일을 업로드할 수 있음. `user-view-settings`는 클라이언트가 `user_key`를 보내는 구조라 임의의 타 사용자 설정을 읽고 덮어쓸 수 있음.
- **수정 방향**:
  - Supabase auth 세션을 서버에서 검증하는 헬퍼(`createServerSupabaseClient` with cookies) 도입.
  - 각 라우트 상단에서 `supabase.auth.getUser()`로 인증 확인 → 401 리턴.
  - `user-view-settings`의 `user_key`는 body가 아니라 세션에서 도출.
  - 조직/팀 기반 권한이 필요하면 RLS 정책을 함께 재설계 (service_role로 우회 중이면 RLS가 먹지 않음 — 엔드포인트별로 service_role vs anon 클라이언트를 구분해야 함).

### C3. 파일 업로드에 MIME/확장자 화이트리스트가 없음
- **파일**: `app/api/upload/route.ts`
- **문제**: `multipart/form-data`로 오는 파일을 MIME/확장자 검증 없이 Supabase Storage로 전달. `.exe`, `.html`(저장소에 호스팅되면 XSS), `.svg`(스크립트 삽입), 대용량 미디어 등 무엇이든 업로드 가능. C2의 인증 부재와 결합하면 스토리지가 사실상 익명 업로드 버킷이 됨.
- **수정 방향**:
  - 허용 확장자/MIME 집합 정의 (예: `image/*`, `application/pdf`, `.xlsx`, `.zip` 등 사용하는 것만).
  - 파일 시그니처(매직 바이트) 검증 — 확장자만으로는 쉽게 우회됨.
  - 저장 시 파일명을 서버가 생성(uuid)하고 원본 이름은 별도 메타로만 보관 — path traversal 방지.
  - Storage 버킷 자체에 RLS/object size/mime 제한도 중복으로 걸기.

### C4. `order_items` PATCH에 값 타입 검증이 전혀 없음
- **파일**: `app/api/order-items/[id]/route.ts`
- **문제**: `EDITABLE_FIELDS` 화이트리스트로 필드명만 검증하고 `value`는 `any`. `중량`에 문자열/객체를, `검수`(boolean)에 임의 JSON을 넣을 수 있음. Postgres가 일부는 거부하지만, `text` 컬럼에는 길이 제한 없이 거대한 페이로드가 저장됨 (DoS / 저장소 고갈).
- **수정 방향**:
  - 필드별 기대 타입 맵 정의 (number / boolean / date string / enum / text length limit).
  - `zod` 등으로 `{ field, value }`를 필드명에 따라 dispatch validation.
  - `데드라인` 등 date 컬럼은 `YYYY-MM-DD` 정규식 + 빈 문자열 → null 정규화를 서버에서도 수행(현재는 클라이언트에서만 — WorksGrid.tsx:1146).

### C5. `flat_order_details` 조회에 서버측 필터/정렬 입력 검증이 없음
- **파일**: `app/api/order-items/route.ts`
- **문제**: 클라이언트가 보낸 `filters_json`, `sort_by`, `search_term`을 그대로 Supabase RPC에 전달. 악성 클라이언트가 공식 UI에서 노출되지 않는 컬럼/조건을 넣을 수 있고, 필터 조합에 따라 매우 무거운 쿼리를 유발할 수 있음. 현재 로그에도 `Could not choose the best candidate function` 에러가 남 — 오버로드된 RPC 시그니처 충돌은 별도로 해결 필요.
- **수정 방향**:
  - 필터 대상 컬럼/오퍼레이터 화이트리스트.
  - `limit`는 서버에서 최대값(예: 200) cap.
  - 오버로드된 `count_flat_order_details(jsonb, text)` 시그니처 하나로 통일(이 건은 DB 작업 → claude.ai에서 처리 필요).

---

## Warning (가까운 시일 내 조치)

### W1. `holidays` 엔드포인트가 무한 개수를 반환
- **파일**: `app/api/holidays/route.ts`
- **문제**: `limit` 없이 `SELECT * FROM holidays`. 테이블이 커지면 초기 로딩 전체가 블로킹. `WorksGrid`는 `holidaySet`이 비면 출고예정일 계산을 건너뛰므로 느려지면 UX 저하.
- **수정 방향**: 최근 N년 범위 또는 `limit` 도입. 응답에 `Cache-Control: s-maxage=3600` 도 붙이기(공휴일은 거의 변하지 않음).

### W2. 모듈 레벨 mutable 전역 변수가 컴포넌트 경계를 침범
- **파일**: `components/works/WorksGrid.tsx:171-172, 256-260` 부근 (`onAttachmentUpload`, `onImageGallery`, `checkedRowsRefGlobal`, `lastCheckedRowRefGlobal`, `setSelectedRowIdsGlobal`, `hotRefGlobal`)
- **문제**: Handsontable renderer가 클로저에 접근할 수 없어서 도입한 패턴이지만 (a) 컴포넌트가 두 번 마운트되면(테스트, 라우트 전환, StrictMode) 서로 덮어씀 (b) 언마운트 시 `null`로 되돌리지 않아 dead handler 참조 잔존 가능 (c) SSR에서 두 요청이 모듈을 공유할 경우 race 위험(현재는 `'use client'`라 괜찮지만 리팩터 시 위험).
- **수정 방향**:
  - `React.createContext` + `useContext` 로 renderer가 현재 인스턴스 상태에 접근하게.
  - 또는 HOT의 `cellProperties.instance` → React ref Map 방식으로 instance scope를 유지.
  - 당장 완전 대체가 어렵다면, 최소한 unmount cleanup에서 전역을 `null`로 되돌리는 방어 코드 추가.

### W3. 렌더링 중 ref 직접 할당
- **파일**: `components/works/WorksGrid.tsx:821-825` 부근 (`rowsRef.current = rows` 등)
- **문제**: React render 함수 본문에서 ref mutation은 "side-effect in render"로 권장되지 않음. StrictMode 이중 호출에선 두 번 할당되지만 현재 로직에선 무해. 다만 concurrent rendering / transitions 도입 시 깨질 수 있음.
- **수정 방향**: `useEffect(() => { rowsRef.current = rows }, [rows])` 패턴으로 이동. 혹은 `useSyncExternalStore`로 rows를 외부 스토어화.

### W4. 프로덕션 `console.log`
- **파일**: `components/works/WorksGrid.tsx:923` (`console.log('[WorksGrid] filters:', ...)`)
- **문제**: 엔드유저 devtools에 필터 JSON이 그대로 찍힘. 민감도는 낮지만 노이즈이고 향후 정보 누출 소지.
- **수정 방향**: 제거하거나 `process.env.NODE_ENV === 'development'` 가드. 전 프로젝트에 `no-console` ESLint 룰 적용 고려.

### W5. afterChange의 PATCH가 순차 대기 없이 발사되고, rollback도 개별
- **파일**: `components/works/WorksGrid.tsx:1151-1183`
- **문제**: 다중 셀 편집(배치 삭제 등)에서 N번의 개별 PATCH가 병렬로 나감. 일부만 실패하면 UI는 일부 셀만 롤백되어 "반쯤 되돌아간" 중간 상태가 됨. 서버 관점에서도 N요청 × 편집횟수.
- **수정 방향**:
  - 배치 PATCH API (`PATCH /api/order-items/batch`, body: `{ updates: [{ id, field, value }, ...] }`) 도입, 서버는 단일 트랜잭션.
  - 클라이언트 afterChange는 배치 단위로 묶어 한 번에 보냄.
  - undo 시에도 동일하게 배치 전송 → rollback semantics 단순화.

### W6. Realtime 구독이 편집 중 optimistic 상태를 덮어쓸 수 있음
- **파일**: `components/works/WorksGrid.tsx:1413-1450`
- **문제**: 본인 PATCH의 결과도 `UPDATE` 이벤트로 돌아옴. Row 데이터에서 `payload.new`를 그대로 `setRows`에 반영하므로, PATCH는 성공했지만 Realtime이 느리게 도착하면 `optimistic → 서버값` 재렌더로 깜빡임. 본인이 편집 중인 셀에 다른 클라이언트의 UPDATE가 도착하면 편집기가 닫히지 않은 채 내부 값이 바뀜.
- **수정 방향**:
  - PATCH 응답의 `updated_at`을 기록 → Realtime 이벤트의 `updated_at`이 같거나 이전이면 무시.
  - `hot.getActiveEditor()?.isOpened()`인 동안엔 해당 row의 해당 field 업데이트를 큐잉 후 편집 종료 시 적용.

### W7. `useEffect` cleanup 타이머 누수
- **파일**: `components/works/WorksGrid.tsx` 전반 (`setTimeout(() => setToast(null), ...)`, `1507` 등 다수)
- **문제**: `setTimeout` 핸들을 저장하지 않아 unmount 후에도 콜백이 실행되며, 그 시점 `setToast`가 이미 stale하면 무해하지만 React가 unmounted state update 경고를 띄울 수 있음. 또 동일 토스트에 두 개의 타이머(ex: 성공 토스트 후 에러 토스트 → 앞 타이머가 남아 뒤 토스트를 조기 클리어) 발생 가능.
- **수정 방향**:
  - 토스트 타이머를 `useRef<number | null>`에 저장, `setToast` 시 이전 타이머 `clearTimeout`.
  - 언마운트 시 cleanup.

### W8. Attachment / Image 렌더러가 매 렌더마다 DOM 전면 재생성
- **파일**: `components/works/WorksGrid.tsx:1-200` 구간 (`attachmentRenderer`, `imageRenderer`)
- **문제**: HOT renderer 특성상 불가피한 부분도 있으나, `td.innerHTML = ''` 후 하위 요소를 전부 `document.createElement`로 생성하는 현재 구조는 스크롤/편집마다 수십 개 DOM 노드 재할당. `skipNextLoadRef` 최적화로 큰 폭은 개선되었지만 스크롤 시 여전히 비용.
- **수정 방향**:
  - 이전 렌더의 데이터 서명(파일 id 배열 등)을 `td.dataset`에 저장 → 동일하면 skip.
  - 혹은 React 기반 커스텀 에디터/렌더러로 치환(HOT + React bridge).

### W9. `useEffect([])`에서 `hotRef.current`에 훅을 누적 등록
- **파일**: `components/works/WorksGrid.tsx:1012+ (HOT init useEffect)`
- **문제**: cleanup이 `hotRef.current?.destroy()`이라 마운트/언마운트 사이클에선 안전하지만, fast refresh로 `useEffect`가 재실행되면 `hotRef.current`가 이미 있는 상태에서 또 훅을 추가하는 경로가 생김. 현재 코드는 init 분기를 `useEffect([])`로 1회만 실행하지만, 실수로 deps를 바꾸면 훅이 중복 등록되어 afterChange가 N번 실행되는 버그로 이어짐.
- **수정 방향**:
  - init 함수에 "이미 초기화됨" 가드. 모든 `addHook` 호출 전에 `hotRef.current`를 만든 직후에만 수행하도록 주석/assert.

### W10. 날짜 editor DOM 조작이 `setTimeout(…, 30)`에 의존
- **파일**: `components/works/WorksGrid.tsx:1213`
- **문제**: Pikaday 초기화 타이밍을 30ms delay로 추정. 느린 기기/CI에서 editor DOM이 아직 없으면 버튼 숨기기가 실패.
- **수정 방향**: `requestAnimationFrame` 두 번 + `MutationObserver`로 editor 등장 감지, 또는 Pikaday 인스턴스 이벤트에 훅.

### W11. `user-view-settings` upsert에 `user_key` 서버 검증 없음
- **파일**: `app/api/user-view-settings/route.ts`
- **문제**: 클라이언트가 임의 문자열을 `user_key`로 전송 가능. "뷰 설정 덮어쓰기로 타 사용자 UI 교란" 가능.
- **수정 방향**: C2와 함께 세션 사용자 id를 서버에서 도출, body의 `user_key`는 무시.

### W12. 에러 응답이 Supabase 원본 메시지를 그대로 반환
- **파일**: `app/api/order-items/route.ts`, `.../[id]/route.ts` 등
- **문제**: 내부 스키마/제약 이름이 에러 메시지로 클라이언트에 노출됨. 공격자에겐 정찰 정보.
- **수정 방향**: 에러 로깅은 서버 stderr에, 클라이언트에는 공통 메시지 + 요청 id만 반환.

### W13. `calcShipDateFromRow`가 holiday 변경 시 전체 재계산
- **파일**: `components/works/WorksGrid.tsx` (관련 useEffect)
- **문제**: `holidaySet.size === 0`일 때만 skip하는 가드 때문에, 사용자가 명시적으로 holidays를 비우는 경우(극단적 케이스)엔 재계산이 트리거되지 않음. 또 rows 수가 많을 때 `setRows(prev => prev.map(...))` 전체 교체가 전역 리렌더링 유발.
- **수정 방향**: holidays 적용은 "row 편집 시 계산 + Realtime 수신 시 계산"으로만 수행하고, 전역 재계산은 더 명시적 트리거로 제한.

---

## Suggestion (품질 / 유지보수 개선)

### S1. `components/works/WorksGrid.tsx`가 1800줄 단일 파일
- **문제**: 렌더러, 컬럼 정의, 훅, JSX, 토스트, 미니바, 드롭다운 메뉴 등이 한 파일. 장기적으로 테스트/리뷰 비용.
- **수정 방향**:
  - `renderers/*.ts` (attachment/image/checkbox/select/purchaseStatus)
  - `columns.ts` (`COLUMNS`, `EDITABLE_FIELD_MAP`, `SELECT_COLUMN_OPTIONS`)
  - `hooks/useUndoRedo.ts` (undoStackRef/redoStackRef/keydown)
  - `hooks/useHotInit.ts`
  - 본체는 300-400줄로 축소.

### S2. `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 다수
- **파일**: `components/works/WorksGrid.tsx` 전반
- **문제**: HOT 타입이 부족한 건 맞지만 20+ 개의 `any` 캐스팅이 누적. 리팩터 시 안전성 하락.
- **수정 방향**:
  - 공통 타입 헬퍼(`type HotCell = ...`, `type ColDef = (typeof COLUMNS)[number]`) 한 곳 정의.
  - `@handsontable/react`의 제네릭을 `<Row>`로 바인딩.

### S3. 스크롤 sync 로직이 세 곳에서 수동 동기화
- **파일**: `components/works/WorksGrid.tsx:1012-1067` (horizontal scroll sync) + `1648-1663` (custom scrollbar onScroll)
- **문제**: `ht_master`, `ht_clone_top`, summary inner, custom scrollbar 4주체를 수작업 동기화. 엣지 케이스(관성 스크롤, 줌) 시 드리프트 가능.
- **수정 방향**: 단일 "scrollController"에서 `requestAnimationFrame` 기반 pump 하나로 일원화.

### S4. `COLUMNS` readonly 판정이 `colDef?.readOnly` 문자열 비교에 흩어져 있음
- **문제**: 새 readonly 컬럼 추가 시 누락 가능성.
- **수정 방향**: `EDITABLE_FIELD_MAP`이 이미 있으므로, `readOnly`는 `!(data in EDITABLE_FIELD_MAP)` 로 파생.

### S5. `SummaryBar`에 rows 전체를 전달
- **파일**: `WorksGrid.tsx:1672-1678`
- **문제**: 선택 영역 요약을 위해 rows 전체를 prop으로 넘김. 16만 건 시점엔 메모 계산이 프로파일 대상.
- **수정 방향**: `selectedRowIndices`가 null이면 전역 합계만, 있으면 인덱스 기준 subset만 전달.

### S6. 전역 CSS `!important` 남용
- **파일**: `app/globals.css` 전반 (수십 개 `!important`)
- **문제**: HOT 기본 스타일과 싸우느라 필요한 건 맞지만, 미래에 HOT 업데이트 / Tailwind 업데이트 시 선택자 경합 디버깅이 어려워짐.
- **수정 방향**: HOT 스타일은 `@layer components`로 묶고, 커스텀 변수 오버라이드 중심으로 재정리. 가능하면 CSS Module scope로 격리.

### S7. `html, body { overflow: hidden }` 전역
- **파일**: `app/globals.css:6-11`
- **문제**: 다른 페이지(설정, 로그인 등)에서도 스크롤이 불가능해짐. Works 대시보드 외 라우트가 늘면 문제.
- **수정 방향**: 해당 overflow는 Works 페이지 래퍼에만 적용(`.works-page` 클래스 등).

### S8. 매직 상수
- **예**: `UNDO_LIMIT`, 스크롤 threshold `0.9`, 페이지 사이즈 `100`, 토스트 timeout `2000/3000/5000` 등이 여러 곳에 흩어짐.
- **수정 방향**: `lib/constants.ts`에 모아서 한눈에 튜닝 가능하게.

### S9. 공통 `fetch` 래퍼 부재
- **문제**: 각 useEffect/handler가 `fetch(...)` + 에러 처리 + toast를 반복. 실패시 재시도/abort/타임아웃 로직도 각자.
- **수정 방향**: `api.ts` 헬퍼(`apiPost`, `apiPatch`) 도입. `AbortController`로 컴포넌트 unmount 시 요청 취소.

### S10. `hotRef.current?.propToCol(prop)` 반복 조회
- **파일**: `WorksGrid.tsx:1130-1132, 1159, 1165-1167, 1380` 등
- **문제**: 컬럼 수 만큼 문자열 탐색. 편집 hot path에선 `Map<prop, col>`으로 캐시.
- **수정 방향**: COLUMNS 정의 직후 `PROP_TO_COL: Record<string, number>` 빌드.

### S11. Realtime 구독이 DELETE/INSERT를 처리하지 않음
- **파일**: `WorksGrid.tsx:1417` — `event: 'UPDATE'`만
- **문제**: 다른 사용자가 행을 추가/삭제해도 반영 안 됨. 현 UX로 의도된 것일 수 있으나, 협업 상황에선 혼란.
- **수정 방향**: INSERT는 필터 조건과 맞으면 prepend, DELETE는 rows에서 제거. 혹은 Realtime은 본인 편집 feedback용으로만 쓰고 타사용자 변경은 주기 폴링.

### S12. `attachmentRenderer`에서 "빈 버튼 고정 폭" 등 최근 fix가 인라인 스타일
- **파일**: `WorksGrid.tsx` (commit `7a439db`)
- **문제**: globals.css에 동일한 스타일이 이미 있음(`.attachment-empty`). 인라인과 클래스가 혼재하면 CSS 변경 시 실효가 사라지는 혼동.
- **수정 방향**: CSS로 일원화, 렌더러는 class만 부여.

### S13. `@ts-expect-error` / 주석 TODO 부재
- **관찰**: 현재 타입이 깨지는 부분을 `any` 캐스팅으로 덮음. 추적 가능한 TODO가 없어 나중에 정리 대상이 흐려짐.
- **수정 방향**: `// TODO(typing): handsontable generic row type` 같은 주석으로 장부화.

### S14. 접근성 (a11y)
- **문제**: 커스텀 드롭다운(`selectMenu`)과 토스트가 `role`/`aria-live` 미지정. 키보드 포커스 관리 미흡.
- **수정 방향**: `role="listbox"`/`role="option"`, 토스트 `role="status" aria-live="polite"`, Esc로 닫기.

### S15. 로깅/모니터링 훅 부재
- **문제**: PATCH 실패는 토스트만. 실제 프로덕션에서 어떤 사용자가 어떤 필드에 실패했는지 추적 수단 없음.
- **수정 방향**: Sentry 등 초기 도입 또는 Supabase `audit` 테이블에 실패 기록.

---

## 요약 우선순위

1. **지금 바로 패치**: C1(debug fetch 제거), C3(업로드 화이트리스트), W4(console.log 제거) — 코드 한 영역만 고치면 되는 보안/노출 이슈.
2. **이번 스프린트**: C2(API 인증), C4(PATCH 타입 검증), C5(서버측 필터 검증) — 스키마/auth 설계 동반.
3. **다음 스프린트**: W2/W3(전역 & ref 패턴 정리), W5(배치 PATCH), S1(파일 분할) — 구조 리팩터.
4. **점진 개선**: Suggestion 항목 — 기능 추가하면서 같이.

---

*리뷰에서 언급된 DB/RPC 관련 수정(C5의 RPC 오버로드 해소 등)은 CLAUDE.md 역할 분담 원칙에 따라 claude.ai 측 작업 영역.*
