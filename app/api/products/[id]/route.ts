import {
  createPatchRoute,
  createSoftDeleteRoute,
  type FieldSpecs,
} from '@/lib/api/createTableRoute'

export const maxDuration = 10

// products 테이블 편집 가능 필드 명세.
// 제외: lookup/JOIN 유래 파생 컬럼(브랜드명, parent_여부, 가다번호_목록,
// 가다위치_목록, mold_개수, sample_개수, claim_개수)은 RPC 응답에만 존재
// — PATCH 대상 아님. 또한 수식/formula성 컬럼도 제외.
// select 필드(카테고리, 개발_현황, 마감_잠금, 체류지)는 런타임 옵션 카탈로그가
// field_options 테이블에서 로드되므로 enum 고정 대신 text로 허용폭을 둔다.
const FIELD_SPECS: FieldSpecs = {
  '제품명': { type: 'text', maxLength: 200 },
  '제품코드': { type: 'text', maxLength: 100 },
  'brand_id': { type: 'text', maxLength: 64 },
  '카테고리': { type: 'text', maxLength: 50 },
  '발주_가능': { type: 'boolean' },
  '제공_중단': { type: 'boolean' },
  '개발_현황': { type: 'text', maxLength: 50 },
  '기본_공임': { type: 'number' },
  '추가금_도금': { type: 'number' },
  '추가금_sil': { type: 'number' },
  '추가금_wg': { type: 'number' },
  '추가금_yg': { type: 'number' },
  '추가금_rg': { type: 'number' },
  '제작_소요일': { type: 'number' },
  '기준_중량': { type: 'number' },
  '체인_두께': { type: 'number' },
  '마감_잠금': { type: 'text', maxLength: 50 },
  '검수_유의': { type: 'text', maxLength: 2000 },
  '작업지시서': { type: 'text', maxLength: 2000 },
  '체류지': { type: 'text', maxLength: 50 },
  '파일_경로': { type: 'text', maxLength: 500 },
  '개발_슬랙_링크': { type: 'text', maxLength: 500 },
  '개발_슬랙_id': { type: 'text', maxLength: 100 },
  '슬랙_thread_id': { type: 'text', maxLength: 100 },
  '원가_스톤세팅비': { type: 'number' },
  '원가_원자재비': { type: 'number' },
  '원가_주물비': { type: 'number' },
  '원가_고정각인비': { type: 'number' },
  '원가_폴리싱비': { type: 'number' },
  '원가_기타': { type: 'number' },
  '원가_체인비': { type: 'number' },
  '원가_심플랩스': { type: 'number' },
}

export const PATCH = createPatchRoute({
  table:      'products',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[products]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'products',
  logPrefix: '[products]',
})
