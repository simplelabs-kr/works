import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_products',
  countRpc:  'count_products',
  logPrefix: '[products]',
})
