import {
  createPatchRoute,
  createSoftDeleteRoute,
  type FieldSpecs,
} from '@/lib/api/createTableRoute'

export const maxDuration = 10

// repairs 테이블 편집 가능 필드 명세.
// 제외:
//   - JOIN 유래 파생 (브랜드명/브랜드코드/제품명/고객명)
//   - FK 키 (brand_id/product_id/order_item_id/bundle_id) — PATCH 대상 아님
//   - 원래 각인 문구/폰트 — 참고용 readOnly
//   - 고유번호 — 식별자 readOnly
//   - 수선_항목 — 업스트림 분류 lookup, readOnly
//   - 수선_비용 — repair_costs lookup 결과, DB 자동 산출
//   - 최종_수선_비용 — DB formula (수선_비용 + 수선_비용_조정), 직접 편집 금지
// PATCH 는 flat_repairs 가 아닌 repairs 원본 테이블을 직접 업데이트한다
// (flat_repairs 는 트리거가 동기화).
// select 필드(소재/작업_위치)는 런타임 옵션 카탈로그가 field_options 에서
// 로드되므로 enum 고정 대신 text 로 허용폭을 둔다.
const FIELD_SPECS: FieldSpecs = {
  '수선_내용':    { type: 'text',    maxLength: 2000 },
  '소재':         { type: 'text',    maxLength: 50 },
  '수량':         { type: 'number' },
  '전_중량':      { type: 'number' },
  '수선_비용_조정': { type: 'number' },
  '비용_조정_사유': { type: 'text', maxLength: 2000 },
  '수선시작일':   { type: 'date' },
  '데드라인':     { type: 'date' },
  '작업_위치':    { type: 'text',    maxLength: 50 },
  '검수':         { type: 'boolean' },
  '포장':         { type: 'boolean' },
  '수령':         { type: 'boolean' },
  '이동_확인':    { type: 'boolean' },
  '원부자재_구매_필요': { type: 'boolean' },
  '생성자':       { type: 'text',    maxLength: 100 },
  '검수자':       { type: 'text',    maxLength: 100 },
  '비고':         { type: 'text',    maxLength: 2000 },
  '생성일시':     { type: 'date' },
}

export const PATCH = createPatchRoute({
  table:      'repairs',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[repairs]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'repairs',
  logPrefix: '[repairs]',
})
