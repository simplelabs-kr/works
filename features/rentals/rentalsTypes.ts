// Domain types for the Rentals grid.
//
// `RentalItem` = `search_rentals` RPC 가 돌려주는 raw shape — rentals 테이블
// 소유 컬럼 + JOIN-derived name 컬럼 (브랜드명 / 브랜드코드 / 제품명) + FK 키.
// `RentalRow` = HOT 바인딩 display shape. null 은 transformRow 에서 '' / null /
// false 로 정규화.

export type RentalItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // identity / descriptive
  이름: string | null
  고유번호: string | null

  // JOIN-derived (read-only)
  브랜드명: string | null
  브랜드코드: string | null
  제품명: string | null

  // status
  현황: string | null
  반납: boolean | null

  // quantities / pricing
  수량: number | null
  공급가액: number | null
  공임: number | null
  소재비: number | null
  기준_소재비: number | null
  중량: number | null
  순금_중량: number | null

  // dates / notes
  생산시작일: string | null
  반품_번들명: string | null
  디자이너_노트: string | null
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

  이름: string
  고유번호: string

  브랜드명: string
  브랜드코드: string
  제품명: string

  현황: string
  반납: boolean

  수량: number | null
  공급가액: number | null
  공임: number | null
  소재비: number | null
  기준_소재비: number | null
  중량: number | null
  순금_중량: number | null

  생산시작일: string
  반품_번들명: string
  디자이너_노트: string
  생성일시: string

  brand_id: string | null
  order_item_id: string | null
  bundle_id: string | null
}
