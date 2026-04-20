import {
  createPatchRoute,
  createSoftDeleteRoute,
  type FieldSpecs,
} from '@/lib/api/createTableRoute'

export const maxDuration = 10

// 필드별 타입/제약 명세. EDITABLE_FIELDS 의 변경은 반드시 이 맵과 동기화.
const FIELD_SPECS: FieldSpecs = {
  '사출_방식': { type: 'enum', values: ['RP', '왁스', ''] },
  '중량': { type: 'number' },
  '데드라인': { type: 'date' },
  '작업_위치': { type: 'enum', values: [
    '현장', '검수', '조립', '마무리 광', '조각', '도금', '각인', '광실',
    '세척/검수후재작업', '에폭시(연마)', '에폭시(일반)', '컷팅', '외부',
    '대기', '취소', '조립 대기 중', '유화', '초벌', '',
  ] },
  '검수': { type: 'boolean' },
  '포장': { type: 'boolean' },
  '출고': { type: 'boolean' },
  '왁스_파트_전달': { type: 'boolean' },
  'rp_출력_시작': { type: 'boolean' },
  '주물_후_수량': { type: 'number' },
  '죽은_수량': { type: 'number' },
  '디자이너_노트': { type: 'text', maxLength: 2000 },
  'reference_files': { type: 'attachment_list' },
}

export const PATCH = createPatchRoute({
  table:      'order_items',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[order-items]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'order_items',
  logPrefix: '[order-items]',
})
