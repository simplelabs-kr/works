// Domain types for the Other Materials (기타 원부자재) grid.

export type OtherMaterialItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  종류: string | null
  supplier_이름: string | null
  소재: string | null
  세부_소재: string | null
  모델명: string | null
  공임: number | null
  중량: number | null
  컵_크기: number | null
  침_제원: string | null
  링크: string | null
  비고: string | null
}

export type OtherMaterialRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  종류: string
  supplier_이름: string
  소재: string
  세부_소재: string
  모델명: string
  공임: number | null
  중량: number | null
  컵_크기: number | null
  침_제원: string
  링크: string
  비고: string
}
