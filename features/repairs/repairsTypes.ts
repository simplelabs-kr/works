// Domain types for the Repairs grid.
//
// `RepairItem` matches the row shape returned by the `search_flat_repairs`
// RPC (flat_repairs table — repairs owned columns + JOIN-derived name
// columns 브랜드명 / 브랜드코드 / 제품명 / 고객명 and FK keys).
// `RepairRow` is the display row — shaped to directly back HOT data props.

export type RepairItem = {
  id: string
  airtable_record_id?: string | null
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // identity
  고유번호: string | null

  // JOIN-derived name columns (read-only)
  브랜드명: string | null
  브랜드코드: string | null
  제품명: string | null
  고객명: string | null

  // repair details
  수선_내용: string | null
  수선_항목: string | null
  소재: string | null
  수량: number | null
  전_중량: number | null

  // pricing
  수선_비용: number | null
  수선_비용_조정: number | null
  최종_수선_비용: number | null
  비용_조정_사유: string | null

  // engraving (historical)
  원래_각인_문구: string | null
  원래_각인_폰트: string | null

  // scheduling
  수선시작일: string | null
  데드라인: string | null
  작업_위치: string | null

  // status flags
  검수: boolean | null
  포장: boolean | null
  수령: boolean | null
  이동_확인: boolean | null
  원부자재_구매_필요: boolean | null

  // actors / notes
  생성자: string | null
  검수자: string | null
  비고: string | null
  생성일시: string | null

  // FK keys (read-only)
  brand_id: string | null
  product_id: string | null
  order_item_id: string | null
  bundle_id: string | null
}

export type RepairRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string

  브랜드명: string
  브랜드코드: string
  제품명: string
  고객명: string

  수선_내용: string
  수선_항목: string
  소재: string
  수량: number | null
  전_중량: number | null

  수선_비용: number | null
  수선_비용_조정: number | null
  최종_수선_비용: number | null
  비용_조정_사유: string

  원래_각인_문구: string
  원래_각인_폰트: string

  수선시작일: string
  데드라인: string
  작업_위치: string

  검수: boolean
  포장: boolean
  수령: boolean
  이동_확인: boolean
  원부자재_구매_필요: boolean

  생성자: string
  검수자: string
  비고: string
  생성일시: string

  brand_id: string | null
  product_id: string | null
  order_item_id: string | null
  bundle_id: string | null
}
