// Domain types for the Metal Prices grid.
//
// `MetalPriceItem` = `search_flat_metal_prices` RPC raw shape.
// `MetalPriceRow`  = HOT display shape (transformRow output).

export type MetalPriceItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  date: string | null
  metal: string | null
  price_per_gram: number | null
}

export type MetalPriceRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  date: string
  metal: string
  price_per_gram: number | null
}
