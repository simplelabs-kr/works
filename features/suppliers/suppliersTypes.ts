// Domain types for the Suppliers (거래처) grid.

export type SupplierItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  연락처: string | null
  주소: string | null
  매입_품목: string | null
}

export type SupplierRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  연락처: string
  주소: string
  매입_품목: string
}
