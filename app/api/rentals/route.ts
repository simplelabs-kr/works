import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

// Case A — flat_rentals 단일 테이블 조회.
export const POST = createListRoute({
  searchRpc: 'search_flat_rentals',
  countRpc:  'count_flat_rentals',
  logPrefix: '[rentals]',
})
