// Domain types for the Stone Cuts (스톤 컷팅) grid.

export type StoneCutItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  컷팅: string | null
}

export type StoneCutRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  컷팅: string
}
