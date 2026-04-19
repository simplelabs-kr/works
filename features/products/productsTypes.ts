// Domain types for the Products grid.
//
// `ProductItem` matches the row shape returned by the `search_products` RPC
// (products table + JOIN-derived columns: 브랜드명, parent_여부,
// 가다번호_목록, 가다위치_목록, mold_개수, sample_개수, claim_개수).
// `ProductRow` is the display row — shaped to directly back HOT data props.

export type ProductItem = {
  id: string
  airtable_record_id?: string | null
  updated_at?: string | null
  created_at?: string | null
  deleted_at?: string | null

  // identity / brand
  제품코드: string | null
  제품명: string | null
  brand_id: string | null
  브랜드명: string | null
  카테고리: string | null

  // status flags
  발주_가능: boolean | null
  제공_중단: boolean | null
  개발_현황: string | null

  // pricing
  기본_공임: number | null
  추가금_도금: number | null
  추가금_sil: number | null
  추가금_wg: number | null
  추가금_yg: number | null
  추가금_rg: number | null

  // production
  제작_소요일: number | null
  기준_중량: number | null
  체인_두께: number | null
  마감_잠금: string | null
  검수_유의: string | null
  작업지시서: string | null
  체류지: string | null

  // paths / links
  파일_경로: string | null
  개발_슬랙_링크: string | null
  개발_슬랙_id: string | null
  슬랙_thread_id: string | null

  // costs
  원가_스톤세팅비: number | null
  원가_원자재비: number | null
  원가_주물비: number | null
  원가_고정각인비: number | null
  원가_폴리싱비: number | null
  원가_기타: number | null
  원가_체인비: number | null
  원가_심플랩스: number | null

  // JOIN-derived (read-only)
  parent_여부: boolean | null
  가다번호_목록: string | null
  가다위치_목록: string | null
  mold_개수: number | null
  sample_개수: number | null
  claim_개수: number | null
}

export type ProductRow = {
  id: string
  updated_at: string | null
  created_at: string | null

  제품코드: string
  제품명: string
  brand_id: string | null
  브랜드명: string
  카테고리: string

  발주_가능: boolean
  제공_중단: boolean
  개발_현황: string

  기본_공임: number | null
  추가금_도금: number | null
  추가금_sil: number | null
  추가금_wg: number | null
  추가금_yg: number | null
  추가금_rg: number | null

  제작_소요일: number | null
  기준_중량: number | null
  체인_두께: number | null
  마감_잠금: string
  검수_유의: string
  작업지시서: string
  체류지: string

  파일_경로: string
  개발_슬랙_링크: string
  개발_슬랙_id: string
  슬랙_thread_id: string

  원가_스톤세팅비: number | null
  원가_원자재비: number | null
  원가_주물비: number | null
  원가_고정각인비: number | null
  원가_폴리싱비: number | null
  원가_기타: number | null
  원가_체인비: number | null
  원가_심플랩스: number | null

  // 읽기 전용 파생
  parent_여부: boolean
  가다번호_목록: string
  가다위치_목록: string
  mold_개수: number | null
  sample_개수: number | null
  claim_개수: number | null
}
