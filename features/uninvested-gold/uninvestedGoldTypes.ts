// Domain types for the Uninvested Gold (미투자 금) grid.

export type UninvestedGoldItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  소재: string | null
  날짜: string | null
  중량_합금: number | null
  함량비: number | null
  중량_순금: number | null
}

export type UninvestedGoldRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  소재: string
  날짜: string
  중량_합금: number | null
  함량비: number | null
  중량_순금: number | null
}
