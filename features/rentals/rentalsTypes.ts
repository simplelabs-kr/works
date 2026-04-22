// Domain types for the Rentals grid.
//
// `RentalItem` = `search_rentals` RPC 가 돌려주는 raw shape — rentals 테이블
// 소유 컬럼 + JOIN-derived name (브랜드명 / 브랜드코드 / 제품명) + FK 키.
// `RentalRow` = HOT 바인딩 display shape.
//
// formula / lookup 컬럼 (이름, 현황, 수량, 공급가액, 공임, 소재비,
// 기준_소재비, 중량, 순금_중량, 생산시작일, 디자이너_노트) 은 DB 스키마에서
// 제거됨 — migrate_rentals.py 도 동일하게 반영.

export type RentalItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // identity
  고유번호: string | null

  // JOIN-derived (read-only)
  브랜드명: string | null
  브랜드코드: string | null
  제품명: string | null

  // owned
  반납: boolean | null
  반품_번들명: string | null
  생성일시: string | null

  // FK (read-only in grid catalog; 타입엔 유지)
  brand_id: string | null
  order_item_id: string | null
  bundle_id: string | null
}

export type RentalRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string

  브랜드명: string
  브랜드코드: string
  제품명: string

  반납: boolean
  반품_번들명: string
  생성일시: string

  brand_id: string | null
  order_item_id: string | null
  bundle_id: string | null
}
