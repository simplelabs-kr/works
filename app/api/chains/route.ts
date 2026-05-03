import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_chains',
  countRpc:  'count_flat_chains',
  logPrefix: '[chains]',
})
