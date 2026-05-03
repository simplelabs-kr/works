// Domain types for the Flasks (깡/플라스크) grid.

export type FlasksItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  깡_번호: string | null
  소재: string | null
  왁스_중량: number | null
  필요_합금_중량: number | null
  투입_기존합금: number | null
  추가_필요_합금: number | null
  투입_순금_순은: number | null
  투입_총_합금: number | null
  트리_완성일: string | null
  주물예정일: string | null
  주물_절삭률: number | null
}

export type FlasksRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  깡_번호: string
  소재: string
  왁스_중량: number | null
  필요_합금_중량: number | null
  투입_기존합금: number | null
  추가_필요_합금: number | null
  투입_순금_순은: number | null
  투입_총_합금: number | null
  트리_완성일: string
  주물예정일: string
  주물_절삭률: number | null
}
