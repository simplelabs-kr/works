import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_order_details',
  countRpc:  'count_flat_order_details',
  logPrefix: '[order-items]',
})
