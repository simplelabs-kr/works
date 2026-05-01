import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_metal_prices',
  countRpc:  'count_flat_metal_prices',
  logPrefix: '[metal-prices]',
})
