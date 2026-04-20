import { createPermanentDeleteRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createPermanentDeleteRoute({
  table:     'products',
  logPrefix: '[products/permanent-delete]',
})
