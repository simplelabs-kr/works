import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_sprue_weights',
  countRpc:  'count_flat_sprue_weights',
  logPrefix: '[sprue-weights]',
})
