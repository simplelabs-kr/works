// Domain types for the Price Changes (공임 변경) grid.

export type PriceChangeItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  제품명: string | null
  제품코드: string | null
  공임_변경_공지일: string | null
  공임_변경_적용일: string | null
  전_공임: number | null
  후_공임: number | null
  조정액: number | null
}

export type PriceChangeRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  제품명: string
  제품코드: string
  공임_변경_공지일: string
  공임_변경_적용일: string
  전_공임: number | null
  후_공임: number | null
  조정액: number | null
}
