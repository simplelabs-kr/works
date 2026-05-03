import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_claims',
  countRpc:  'count_flat_claims',
  logPrefix: '[claims]',
})
