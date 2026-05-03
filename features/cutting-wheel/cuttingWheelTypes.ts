// Domain types for the Cutting Wheel (절삭 - 휠) grid.

export type CuttingWheelItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  소재: string | null
  번호: string | null
  작업일: string | null
  전_합금: number | null
  후_합금: number | null
  절삭량_합금: number | null
  절삭률: number | null
  함량비: number | null
  절삭량_순금: number | null
}

export type CuttingWheelRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  소재: string
  번호: string
  작업일: string
  전_합금: number | null
  후_합금: number | null
  절삭량_합금: number | null
  절삭률: number | null
  함량비: number | null
  절삭량_순금: number | null
}
