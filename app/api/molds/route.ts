import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_molds',
  countRpc:  'count_flat_molds',
  logPrefix: '[molds]',
})
