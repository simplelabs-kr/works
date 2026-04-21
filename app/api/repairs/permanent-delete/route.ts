import { createPermanentDeleteRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createPermanentDeleteRoute({
  table:     'repairs',
  logPrefix: '[repairs/permanent-delete]',
})
