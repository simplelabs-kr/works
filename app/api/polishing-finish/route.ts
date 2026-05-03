import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_polishing_finish',
  countRpc:  'count_flat_polishing_finish',
  logPrefix: '[polishing-finish]',
})
