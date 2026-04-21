import { createBulkDeleteRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createBulkDeleteRoute({
  table:     'repairs',
  logPrefix: '[repairs/bulk-delete]',
})
