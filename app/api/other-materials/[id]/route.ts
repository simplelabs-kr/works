import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { OTHER_MATERIALS_COLUMNS, OTHER_MATERIALS_EDITABLE_FIELDS } from '@/features/other-materials/otherMaterialsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: OTHER_MATERIALS_COLUMNS as readonly SpecColumnLike[],
  editableFields: OTHER_MATERIALS_EDITABLE_FIELDS,
  page: 'other-materials',
})

export const PATCH = createPatchRoute({
  table:      'other_materials',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[other-materials]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'other_materials',
  logPrefix: '[other-materials]',
})
