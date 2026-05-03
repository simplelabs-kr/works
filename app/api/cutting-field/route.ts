import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_cutting_field',
  countRpc:  'count_flat_cutting_field',
  logPrefix: '[cutting-field]',
})
