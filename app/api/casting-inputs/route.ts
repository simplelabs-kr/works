import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_casting_inputs',
  countRpc:  'count_flat_casting_inputs',
  logPrefix: '[casting-inputs]',
})
