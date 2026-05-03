// Domain types for the Stone Types (스톤 종류) grid.

export type StoneTypeItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  명칭: string | null
  비고: string | null
}

export type StoneTypeRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  명칭: string
  비고: string
}
