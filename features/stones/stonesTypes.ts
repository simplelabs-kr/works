// Domain types for the Stones (스톤) grid.

export type StoneItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  스톤명: string | null
  stone_type_명칭: string | null
  stone_cut_컷팅: string | null
  사이즈_mm: string | null
  supplier_이름: string | null
  원가_스톤: number | null
  원가_세팅비: number | null
  청구_금액: number | null
  개당_중량: number | null
  추가_정보: string | null
}

export type StoneRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  스톤명: string
  stone_type_명칭: string
  stone_cut_컷팅: string
  사이즈_mm: string
  supplier_이름: string
  원가_스톤: number | null
  원가_세팅비: number | null
  청구_금액: number | null
  개당_중량: number | null
  추가_정보: string
}
