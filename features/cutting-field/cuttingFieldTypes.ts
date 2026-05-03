// Domain types for the Cutting Field (절삭 - 필드) grid.

export type CuttingFieldItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  소재: string | null
  번호: string | null
  주물일: string | null
  작업일: string | null
  전_합금: number | null
  후_합금_제품: number | null
  후_합금_뽕대: number | null
  함량비: number | null
  절삭량_순금: number | null
  절삭률: number | null
}

export type CuttingFieldRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  소재: string
  번호: string
  주물일: string
  작업일: string
  전_합금: number | null
  후_합금_제품: number | null
  후_합금_뽕대: number | null
  함량비: number | null
  절삭량_순금: number | null
  절삭률: number | null
}
