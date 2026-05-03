// Domain types for the Chains (체인) grid.

export type ChainItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  체인명: string | null
  supplier_이름: string | null
  품번: string | null
  소재: string | null
  중량_50cm: number | null
  매입가격_50cm: number | null
  공임_50cm: number | null
  비고: string | null
}

export type ChainRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  체인명: string
  supplier_이름: string
  품번: string
  소재: string
  중량_50cm: number | null
  매입가격_50cm: number | null
  공임_50cm: number | null
  비고: string
}
