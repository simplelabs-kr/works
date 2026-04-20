import { createRestoreRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

export const POST = createRestoreRoute({
  table:     'products',
  logPrefix: '[products/restore]',
})
