import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

// Case B — 직접 JOIN. search_rentals RPC 가 rentals + 연관 테이블을
// JOIN 해서 shape 를 만든다. flat table 없음.
export const POST = createListRoute({
  searchRpc: 'search_rentals',
  countRpc:  'count_rentals',
  logPrefix: '[rentals]',
})
