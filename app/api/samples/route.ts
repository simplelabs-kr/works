import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_samples',
  countRpc:  'count_flat_samples',
  logPrefix: '[samples]',
})
