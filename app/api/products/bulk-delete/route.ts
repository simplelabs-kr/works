import { createBulkDeleteRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createBulkDeleteRoute({
  table:     'products',
  logPrefix: '[products/bulk-delete]',
})
