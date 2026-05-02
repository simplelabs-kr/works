// Domain types for the Purchases (매입) grid.

export type PurchaseChip = {
  id: string
  display: string
  secondary?: string
}

export type PurchaseItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  소재: string | null
  매입처: string | null
  개당_수량: number | null
  // 첫 번째 연결 order_item.발주_수량 (트리거 sync).
  제품_발주_수량: number | null
  // 제품_발주_수량 × 개당_수량 (DB 계산값).
  필요_원부자재_수량: number | null
  발주: boolean | null
  수령: boolean | null
  재고_사용: boolean | null
  비고: string | null

  // Reverse linklist cache (JSONB, 다대다 via purchase_order_items).
  // 트리거가 sync_flat_purchase() 로 갱신.
  order_item_목록: PurchaseChip[] | null
}

export type PurchaseRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  소재: string
  매입처: string
  개당_수량: number | null
  제품_발주_수량: number | null
  필요_원부자재_수량: number | null
  발주: boolean
  수령: boolean
  재고_사용: boolean
  비고: string

  order_item_목록: PurchaseChip[]
}
