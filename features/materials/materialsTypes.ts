// Domain types for the Materials (원부자재 재고) grid.

export type MaterialItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  품목명: string | null
  type: string | null
  supplier_이름: string | null
}

export type MaterialRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  품목명: string
  type: string
  supplier_이름: string
}
