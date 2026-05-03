import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { DUST_COLLECTION_COLUMNS, DUST_COLLECTION_EDITABLE_FIELDS } from '@/features/dust-collection/dustCollectionConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: DUST_COLLECTION_COLUMNS as readonly SpecColumnLike[],
  editableFields: DUST_COLLECTION_EDITABLE_FIELDS,
  page: 'dust-collection',
})

export const PATCH = createPatchRoute({
  table:      'dust_collection',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[dust-collection]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'dust_collection',
  logPrefix: '[dust-collection]',
})
