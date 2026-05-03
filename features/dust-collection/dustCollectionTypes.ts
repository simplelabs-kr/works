// Domain types for the Dust Collection (집진) grid.

export type DustCollectionItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  유형: string | null
  함량: string | null
  축적일: string | null
  중량: number | null
  함량비: number | null
  예상_순금_중량: number | null
}

export type DustCollectionRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  유형: string
  함량: string
  축적일: string
  중량: number | null
  함량비: number | null
  예상_순금_중량: number | null
}
