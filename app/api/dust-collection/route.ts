import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_dust_collection',
  countRpc:  'count_flat_dust_collection',
  logPrefix: '[dust-collection]',
})
