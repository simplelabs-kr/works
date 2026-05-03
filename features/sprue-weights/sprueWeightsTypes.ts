// Domain types for the Sprue Weights (뽕대 중량) grid.

export type SprueWeightsItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  소재: string | null
  종류: string | null
  주물일: string | null
  금_투입일: string | null
  중량_합금: number | null
  함량비: number | null
  중량_순금: number | null
}

export type SprueWeightsRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  소재: string
  종류: string
  주물일: string
  금_투입일: string
  중량_합금: number | null
  함량비: number | null
  중량_순금: number | null
}
