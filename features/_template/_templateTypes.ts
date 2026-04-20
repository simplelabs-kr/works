// TEMPLATE — 새 페이지 Types.
//
// 사용법:
//   1) 이 디렉토리를 통째로 `features/{page}/` 로 복사
//   2) `_template` → `{page}` 로 파일명·식별자 일괄 변경
//      (에디터 find/replace 로 `_template` → `newpage`,
//       `Template` → `Newpage`, `TEMPLATE` → `NEWPAGE`)
//   3) 필드 목록을 실제 flat_{table} 컬럼에 맞춰 수정
//   4) CHECKLIST.md 의 체크리스트 순차 진행
//
// 규칙:
//   - `Item` = search_{table} RPC 가 돌려주는 raw shape. flat_{table}
//     컬럼을 그대로 반영한다. null 가능.
//   - `Row` = HOT 에 바인딩될 display shape. null 이 싫은 컬럼은
//     transformRow 에서 '' 또는 false 로 내린다.
//   - `Item` 의 모든 field 이름은 flat_{table} 의 실제 컬럼명과 정확히
//     일치해야 한다. (productsConfig 의 '가다번호' 버그 참고)

export type TemplateItem = {
  id: string
  airtable_record_id?: string | null
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // TODO: 실제 컬럼으로 교체
  제목: string | null
  수량: number | null
  활성: boolean | null

  // JOIN / 집계 파생 (읽기 전용). flat_{table} 에 물리 컬럼으로
  // 저장되어 있으므로 필터·정렬 가능.
  // TODO: 실제 파생 컬럼으로 교체 / 필요 없으면 삭제
  category_name: string | null
}

export type TemplateRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  // TODO: 실제 컬럼으로 교체
  제목: string
  수량: number | null
  활성: boolean

  category_name: string
}
