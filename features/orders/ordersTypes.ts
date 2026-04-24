// Domain types for the Orders grid.
//
// `OrderItem` matches the row shape returned by the `search_flat_orders`
// RPC (flat_orders table — orders owned columns + JOIN-derived name
// columns 브랜드명 / 브랜드코드 / 제품명 / 제품코드 / 소재명 and FK keys).
// `OrderRow` is the display row — shaped to directly back HOT data props.

export type OrderItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // JOIN-derived name columns (read-only)
  브랜드명: string | null
  브랜드코드: string | null
  제품명: string | null
  제품코드: string | null
  소재명: string | null

  // 발주 내용
  소재: string | null
  도금_색상: string | null
  고객명: string | null
  각인_내용: string | null
  각인_폰트: string | null
  기타_옵션: string | null
  스톤_수동: string | null
  호수: string | null
  체인_두께: string | null
  발주서: string | null

  // 숫자 (정수)
  수량: number | null
  회차: number | null
  확정_공임: number | null
  공임_조정액: number | null

  // 숫자 (실수)
  체인_길이: number | null

  // 날짜
  발주일: string | null
  생산시작일: string | null

  // 체크박스
  발주_입력: boolean | null
  각인_여부: boolean | null

  // 메타 (readOnly text)
  생성일시: string | null

  // FK keys (read-only, 그리드 미표시)
  brand_id: string | null
  product_id: string | null
  metal_id: string | null
}

export type OrderRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  브랜드명: string
  브랜드코드: string
  제품명: string
  제품코드: string
  소재명: string

  소재: string
  도금_색상: string
  고객명: string
  각인_내용: string
  각인_폰트: string
  기타_옵션: string
  스톤_수동: string
  호수: string
  체인_두께: string
  발주서: string

  수량: number | null
  회차: number | null
  확정_공임: number | null
  공임_조정액: number | null

  체인_길이: number | null

  발주일: string
  생산시작일: string

  발주_입력: boolean
  각인_여부: boolean

  생성일시: string

  brand_id: string | null
  product_id: string | null
  metal_id: string | null
}
