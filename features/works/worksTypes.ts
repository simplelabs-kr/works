// Domain types for the Works (flat_order_details) grid.
//
// These are the flat_order_details row shape (`Item`) and the derived display
// row shape (`Row`) produced by transformItem → Row. Kept in one place so
// renderers, config, and the WorksGrid component share a single source of
// truth without creating circular imports.

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'formula'
  | 'image'
  | 'attachment'
  | 'link'
  | 'linklist'
  | 'lookup'

export type ImageItem = { url: string; name: string }
export type AttachmentItem = { url: string; name: string }

// flat_order_details 테이블 구조 (비정규화된 단일 테이블)
export type Item = {
  id: string
  updated_at: string | null
  고유_번호: string
  수량: number | null
  발주_수량: number | null
  수량_조정: number | null
  급자: string | null
  중량: number | null
  디자이너_노트: string | null
  데드라인: string | null
  출고일: string | null
  발송일: string | null
  중단_취소: boolean | null
  검수: boolean | null
  포장: boolean | null
  출고: boolean | null
  작업_위치: string | null
  사출_방식: string | null
  주물_후_수량: number | null
  rp_출력_시작: boolean | null
  왁스_파트_전달: boolean | null
  발주_입력: boolean | null
  발주서: string | null
  생성일시: string | null
  체인_길이: number | null
  체인_두께: string | null
  parent_id: string | null
  parent_airtable_id: string | null
  // order_id: orders 테이블 DROP 후 FK 제거됨. 컬럼은 order_items 에 남아있으나
  // 의미 없음 — 그리드에서는 readOnly 로만 표시.
  order_id: string | null
  product_id: string | null
  brand_id: string | null
  metal_price_id: string | null
  bundle_id: string | null
  // 이전에는 orders JOIN 으로 가져왔던 컬럼들 — 이제 order_items 본체 컬럼.
  소재: string | null
  도금_색상: string | null
  각인_여부: boolean | null
  각인_내용: string | null
  각인_폰트: string | null
  기타_옵션: string | null
  스톤_수동: string | null
  호수: string | null
  고객명: string | null
  발주일: string | null
  생산시작일: string | null
  회차: number | null
  확정_공임: number | null
  공임_조정액: number | null
  // products 유래
  제품명: string | null
  제작_소요일: number | null
  기본_공임: number | null
  // brands/metals 유래
  brand_name: string | null
  metal_name: string | null
  metal_purity: number | null
  // flat_order_details computed/denormalized columns
  시세_g당: number | null
  소재비: number | null
  순금_중량: number | null
  기준_중량: number | null
  허용_중량_범위: string | null
  중량_검토: string | null
  번들_명칭: string | null
  검수_유의: string | null
  가다번호_목록: string | null
  가다_위치_목록: string | null
  출고예정일: string | null
  제품명_코드: string | null
  images: ImageItem[]
  reference_files: AttachmentItem[]
}

export type Row = {
  id: string
  updated_at: string | null
  고유_번호: string
  제품명: string
  제품명_코드: string
  metal_name: string
  metal_purity: string | null
  발주일: string
  생산시작일: string
  제작_소요일: number | null
  데드라인: string
  출고예정일: string
  시세_g당: number | null
  소재비: number | null
  발주_수량: number | null
  수량_조정: number | null
  수량: number | null
  급자: string
  소재: string
  각인_여부: boolean
  스톤_수동: string
  발주_입력: boolean
  회차: number | null
  발주서: string
  생성일시: string
  체인_길이: number | null
  체인_두께: string
  호수: string | null
  고객명: string
  디자이너_노트: string
  중량: number | null
  검수: boolean
  기준_중량: number | null
  허용_중량_범위: string
  중량_검토: string
  기타_옵션: string
  각인_내용: string
  각인_폰트: string
  기본_공임: number | null
  공임_조정액: number | null
  확정_공임: number | null
  번들_명칭: string
  원부자재: string
  발주_현황: string
  작업_위치: string
  검수_유의: string
  도금_색상: string
  사출_방식: string
  가다번호_목록: string | null
  가다_위치_목록: string | null
  주물_후_수량: number | null
  포장: boolean
  순금_중량: number | null
  rp_출력_시작: boolean
  왁스_파트_전달: boolean
  images: ImageItem[]
  reference_files: AttachmentItem[]
}
