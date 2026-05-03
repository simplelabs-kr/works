import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { UNINVESTED_GOLD_COLUMNS, UNINVESTED_GOLD_EDITABLE_FIELDS } from '@/features/uninvested-gold/uninvestedGoldConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: UNINVESTED_GOLD_COLUMNS as readonly SpecColumnLike[],
  editableFields: UNINVESTED_GOLD_EDITABLE_FIELDS,
  page: 'uninvested-gold',
})

export const PATCH = createPatchRoute({
  table:      'uninvested_gold',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[uninvested-gold]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'uninvested_gold',
  logPrefix: '[uninvested-gold]',
})
