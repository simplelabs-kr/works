import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_other_materials',
  countRpc:  'count_flat_other_materials',
  logPrefix: '[other-materials]',
})
