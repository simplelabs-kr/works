import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

// Case A — flat_refunds 단일 테이블 조회.
export const POST = createListRoute({
  searchRpc: 'search_flat_refunds',
  countRpc:  'count_flat_refunds',
  logPrefix: '[refunds]',
})
