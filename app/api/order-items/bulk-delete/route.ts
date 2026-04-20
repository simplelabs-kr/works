import { createBulkDeleteRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createBulkDeleteRoute({
  table:     'order_items',
  logPrefix: '[order-items/bulk-delete]',
})
