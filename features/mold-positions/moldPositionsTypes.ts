// Domain types for the Mold Positions (몰드 위치) grid.

export type MoldPositionItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  보관함_위치: string | null
  동: string | null
  레이어: number | null
  셸프_칸: number | null
  줄: number | null
  열: number | null
  위치: number | null
}

export type MoldPositionRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  보관함_위치: string
  동: string
  레이어: number | null
  셸프_칸: number | null
  줄: number | null
  열: number | null
  위치: number | null
}
