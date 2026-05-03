// Domain types for the Molds (몰드/가다) grid.

export type MoldItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  가다번호: string | null
  제품명: string | null
  제품코드: string | null
  보관함_위치: string | null
  보유_여부: boolean | null
  확인: boolean | null
  출입사항: string | null
  비고: string | null
}

export type MoldRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  가다번호: string
  제품명: string
  제품코드: string
  보관함_위치: string
  보유_여부: boolean
  확인: boolean
  출입사항: string
  비고: string
}
