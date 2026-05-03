// Domain types for the Polishing Finish (연마 - 마감) grid.

export type PolishingFinishItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  고유번호: string | null
  소재: string | null
  번호: string | null
  들어간_날: string | null
  나온_날: string | null
  전_수량: number | null
  후_수량: number | null
  죽은_수량: number | null
  전_중량_합금: number | null
  후_중량_합금: number | null
  절삭량_순금: number | null
  절삭률: number | null
  제품류: string | null
}

export type PolishingFinishRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  고유번호: string
  소재: string
  번호: string
  들어간_날: string
  나온_날: string
  전_수량: number | null
  후_수량: number | null
  죽은_수량: number | null
  전_중량_합금: number | null
  후_중량_합금: number | null
  절삭량_순금: number | null
  절삭률: number | null
  제품류: string
}
