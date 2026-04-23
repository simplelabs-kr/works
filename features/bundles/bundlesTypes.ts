// Domain types for the Bundles grid.
//
// `BundleItem` = `search_bundles` RPC raw shape — bundles 테이블 소유
// 컬럼 + JOIN-derived (브랜드명 / 브랜드코드) + FK 키.
//
// 스키마에서 제거된 컬럼 (formula — DB 스키마에서 제거):
//   구분, 정산_상태, 정산_기한 (STR), 생성일 (STR — created_at 로 대체),
//   출고_체크_일시 는 DB 트리거 자동 관리.
// → Airtable 원본이 아니며 RPC / DB 트리거로 관리. migrate_bundles.py 도
//   동일하게 반영.

export type BundleChip = {
  id: string
  display: string
  secondary?: string
}

export type BundleItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // identity
  번들_고유번호: string | null

  // JOIN-derived (read-only) — search_bundles RPC 가 alias 로 반환.
  //   brands.브랜드명   AS 브랜드명
  //   brands.브랜드코드 AS 브랜드코드
  브랜드명: string | null
  브랜드코드: string | null

  // owned — numeric
  배송비: number | null
  할인_공급가액: number | null
  입금_금액: number | null

  // owned — dates
  명세서_발행일: string | null
  계산서_발행일: string | null

  // owned — checkboxes
  입금_확인: boolean | null
  출고: boolean | null
  명세서_발송: boolean | null
  계산서_발행: boolean | null
  포장_확정: boolean | null
  명세서_출력_완료: boolean | null

  // owned — text
  송장번호: string | null
  비고: string | null
  명세서_url: string | null
  생성자: string | null

  // owned — timestamps (readOnly; 트리거가 자동 세팅)
  입금_확인_일시: string | null
  출고_체크_일시: string | null

  // Reverse linklist caches (JSONB 배열 — 트리거가 sync_flat_bundle() 로 갱신).
  // 각 요소 = { id, display, secondary? }.
  order_item_목록: BundleChip[] | null
  repair_목록: BundleChip[] | null
  rental_목록: BundleChip[] | null

  // FK (read-only in grid catalog; 타입엔 유지)
  brand_id: string | null
}

export type BundleRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  번들_고유번호: string

  브랜드명: string
  브랜드코드: string

  배송비: number | null
  할인_공급가액: number | null
  입금_금액: number | null

  명세서_발행일: string
  계산서_발행일: string

  입금_확인: boolean
  출고: boolean
  명세서_발송: boolean
  계산서_발행: boolean
  포장_확정: boolean
  명세서_출력_완료: boolean

  송장번호: string
  비고: string
  명세서_url: string
  생성자: string

  입금_확인_일시: string | null
  출고_체크_일시: string | null

  order_item_목록: BundleChip[]
  repair_목록: BundleChip[]
  rental_목록: BundleChip[]

  brand_id: string | null
}
