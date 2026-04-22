// Domain types for the Refunds grid.
//
// `RefundItem` = `search_refunds` RPC raw shape — refunds 테이블 소유
// 컬럼 + JOIN-derived name (브랜드명 / 브랜드코드 / 고객명) + FK 키.

export type RefundItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  반품_구분: string | null

  // JOIN-derived (read-only)
  브랜드명: string | null
  브랜드코드: string | null
  고객명: string | null

  // quantities / pricing
  수량: number | null
  공급가액: number | null
  반품_소재비: number | null
  반품_공임: number | null
  반품_금액_합계: number | null
  순금_중량: number | null

  // dates
  반영일: string | null
  생성일시: string | null

  // FK
  order_item_id: string | null
  bundle_id: string | null
  rental_id: string | null
}

export type RefundRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  반품_구분: string

  브랜드명: string
  브랜드코드: string
  고객명: string

  수량: number | null
  공급가액: number | null
  반품_소재비: number | null
  반품_공임: number | null
  반품_금액_합계: number | null
  순금_중량: number | null

  반영일: string
  생성일시: string

  order_item_id: string | null
  bundle_id: string | null
  rental_id: string | null
}
