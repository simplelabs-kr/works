// Domain types for the Refunds grid.
//
// `RefundItem` = `search_refunds` RPC raw shape — refunds 테이블 소유
// 컬럼 + JOIN-derived name (브랜드명 / 브랜드코드 / 고객명 /
// order_item_고유번호 / 번들_고유번호) + FK 키.
//
// 스키마에서 제거된 컬럼 (formula/lookup — DB 스키마에서 제거):
//   이름, 공급가액, 수량, 반품_금액_합계, 반품_소재비, 반품_공임,
//   반영일, 고객명(원본 lookup), 순금_중량.
// → Airtable 원본이 아니며 RPC JOIN 으로 얻는다. migrate_refunds.py 도
//   동일하게 반영.

export type RefundItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  반품_구분: string | null

  // JOIN-derived (read-only) — search_refunds RPC 가 alias 로 반환.
  //   brands.브랜드명                AS 브랜드명
  //   brands.브랜드코드              AS 브랜드코드
  //   order_items.고객명             AS 고객명
  //   flat_order_details.제품명_코드 AS order_item_표시명
  //     (제품명[고유_번호 tail] 포맷 — order-items 페이지의 '제품명[코드]' 와 동일)
  //   bundles.번들_고유번호          AS 번들_고유번호
  브랜드명: string | null
  브랜드코드: string | null
  고객명: string | null
  order_item_표시명: string | null
  번들_고유번호: string | null

  // dates
  생성일시: string | null

  // FK (read-only in grid catalog; 타입엔 유지)
  order_item_id: string | null
  bundle_id: string | null
  rental_id: string | null
}

export type RefundRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  반품_구분: string

  브랜드명: string
  브랜드코드: string
  고객명: string
  order_item_표시명: string
  번들_고유번호: string

  생성일시: string

  order_item_id: string | null
  bundle_id: string | null
  rental_id: string | null
}
