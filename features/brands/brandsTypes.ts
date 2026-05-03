// Domain types for the Brands (브랜드) grid.

export type BrandItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  name: string | null
  브랜드코드: string | null
  담당자: string | null
  연락처: string | null
  이메일: string | null
  파이프라인_단계: string | null
  계약_체결: boolean | null
  계약체결일: string | null
  웹사이트: string | null
  배송_주소: string | null
}

export type BrandRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  name: string
  브랜드코드: string
  담당자: string
  연락처: string
  이메일: string
  파이프라인_단계: string
  계약_체결: boolean
  계약체결일: string
  웹사이트: string
  배송_주소: string
}
