// Domain types for the Purchases (매입) grid.

export type PurchaseItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  소재: string | null
  개당_수량: number | null
  발주: boolean | null
  수령: boolean | null
  재고_사용: boolean | null
  발주일: string | null
  비고: string | null

  // Forward N=1 link to order_items.
  order_item_id: string | null
  // flat_purchases denormalized display column for the linked order_item.
  order_item_표시: string | null
}

export type PurchaseRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  소재: string
  개당_수량: number | null
  발주: boolean
  수령: boolean
  재고_사용: boolean
  발주일: string
  비고: string

  order_item_id: string | null
  order_item_표시: string
}
