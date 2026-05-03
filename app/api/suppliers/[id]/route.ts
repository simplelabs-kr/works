import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { SUPPLIERS_COLUMNS, SUPPLIERS_EDITABLE_FIELDS } from '@/features/suppliers/suppliersConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: SUPPLIERS_COLUMNS as readonly SpecColumnLike[],
  editableFields: SUPPLIERS_EDITABLE_FIELDS,
  page: 'suppliers',
})

export const PATCH = createPatchRoute({
  table:      'suppliers',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[suppliers]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'suppliers',
  logPrefix: '[suppliers]',
})
