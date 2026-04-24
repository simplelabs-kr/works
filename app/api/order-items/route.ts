import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createListRoute({
  searchRpc: 'search_flat_order_details',
  countRpc:  'count_flat_order_details',
  logPrefix: '[order-items]',
  // search_flat_order_details 만 keep_custom_sort 파라미터를 갖고 있다.
  // ON 이면 sortConditions 만 사용, OFF 면 RPC 가 sort_order NULLS LAST,
  // created_at ASC 를 기본 정렬 키로 사용.
  supportsKeepCustomSort: true,
})
