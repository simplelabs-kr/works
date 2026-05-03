import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { CHAINS_COLUMNS, CHAINS_EDITABLE_FIELDS } from '@/features/chains/chainsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: CHAINS_COLUMNS as readonly SpecColumnLike[],
  editableFields: CHAINS_EDITABLE_FIELDS,
  page: 'chains',
})

export const PATCH = createPatchRoute({
  table:      'chains',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[chains]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'chains',
  logPrefix: '[chains]',
})
