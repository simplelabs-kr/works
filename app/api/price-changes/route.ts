import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_price_changes',
  countRpc:  'count_flat_price_changes',
  logPrefix: '[price-changes]',
})
