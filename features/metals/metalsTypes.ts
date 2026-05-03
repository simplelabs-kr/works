// Domain types for the Metals (금속) grid.

export type MetalItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  name: string | null
  metal: string | null
  purity: number | null
  is_composite: boolean | null
}

export type MetalRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  name: string
  metal: string
  purity: number | null
  is_composite: boolean
}
