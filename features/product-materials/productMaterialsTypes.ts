// Domain types for the Product Materials (제품별 원부자재) grid.

export type ProductMaterialItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  품목명: string | null
  제품명: string | null
  제품코드: string | null
  material_품목명: string | null
  개수: number | null
  마감_잠금: string | null
  체인_두께: string | null
}

export type ProductMaterialRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  품목명: string
  제품명: string
  제품코드: string
  material_품목명: string
  개수: number | null
  마감_잠금: string
  체인_두께: string
}
