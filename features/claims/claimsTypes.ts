// Domain types for the Claims (클레임) grid.

export type ClaimItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  제품명: string | null
  제품코드: string | null
  날짜: string | null
  status: string | null
  문제_현상: string | null
  원인: string | null
  해결: string | null
  확인_필요: boolean | null
  확인_필요_사항: string | null
}

export type ClaimRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  제품명: string
  제품코드: string
  날짜: string
  status: string
  문제_현상: string
  원인: string
  해결: string
  확인_필요: boolean
  확인_필요_사항: string
}
