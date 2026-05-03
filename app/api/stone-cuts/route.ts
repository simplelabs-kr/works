import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_stone_cuts',
  countRpc:  'count_flat_stone_cuts',
  logPrefix: '[stone-cuts]',
})
