import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { CLAIMS_COLUMNS, CLAIMS_EDITABLE_FIELDS } from '@/features/claims/claimsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: CLAIMS_COLUMNS as readonly SpecColumnLike[],
  editableFields: CLAIMS_EDITABLE_FIELDS,
  page: 'claims',
})

export const PATCH = createPatchRoute({
  table:      'claims',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[claims]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'claims',
  logPrefix: '[claims]',
})
