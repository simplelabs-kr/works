import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_suppliers',
  countRpc:  'count_flat_suppliers',
  logPrefix: '[suppliers]',
})
