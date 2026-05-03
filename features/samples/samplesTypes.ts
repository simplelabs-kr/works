// Domain types for the Samples (샘플) grid.

export type SampleItem = {
  id: string
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  이름: string | null
  제품명: string | null
  제품코드: string | null
  소재: string | null
  도금_색상: string | null
  스톤: string | null
  수량: number | null
  호수: number | null
  체인_길이: string | null
  기타_옵션: string | null
  데드라인: string | null
  공임조정액: number | null
}

export type SampleRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  이름: string
  제품명: string
  제품코드: string
  소재: string
  도금_색상: string
  스톤: string
  수량: number | null
  호수: number | null
  체인_길이: string
  기타_옵션: string
  데드라인: string
  공임조정액: number | null
}
