import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_purchases',
  countRpc:  'count_flat_purchases',
  logPrefix: '[purchases]',
})
