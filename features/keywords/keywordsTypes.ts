// Domain types for the Keywords (키워드) grid.

export type KeywordItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  keyword: string | null
}

export type KeywordRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  keyword: string
}
