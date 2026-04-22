import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

// Case B — 직접 JOIN. search_bundles RPC 가 bundles + brands 를
// JOIN 해서 shape 를 만든다. flat table 없음.
export const POST = createListRoute({
  searchRpc: 'search_bundles',
  countRpc:  'count_bundles',
  logPrefix: '[bundles]',
})
