// Domain types for the Casting Inputs (금 투입) grid.

export type CastingInputItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  깡_번호: string | null
  소재: string | null
  금_투입일: string | null
  주물일: string | null
  투입_합금: number | null
  투입_순금: number | null
  함량비: number | null
  총_투입_순금: number | null
}

export type CastingInputRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  깡_번호: string
  소재: string
  금_투입일: string
  주물일: string
  투입_합금: number | null
  투입_순금: number | null
  함량비: number | null
  총_투입_순금: number | null
}
