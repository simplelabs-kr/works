import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_orders',
  countRpc:  'count_flat_orders',
  logPrefix: '[orders]',
})
