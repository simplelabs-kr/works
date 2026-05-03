import { createPatchRoute, createSoftDeleteRoute } from '@/lib/api/createTableRoute'
import { deriveFieldSpecs, type SpecColumnLike } from '@/lib/api/deriveFieldSpecs'
import { PRODUCT_MATERIALS_COLUMNS, PRODUCT_MATERIALS_EDITABLE_FIELDS } from '@/features/product-materials/productMaterialsConfig'

export const maxDuration = 10

const FIELD_SPECS = deriveFieldSpecs({
  columns: PRODUCT_MATERIALS_COLUMNS as readonly SpecColumnLike[],
  editableFields: PRODUCT_MATERIALS_EDITABLE_FIELDS,
  page: 'product-materials',
})

export const PATCH = createPatchRoute({
  table:      'product_materials',
  fieldSpecs: FIELD_SPECS,
  logPrefix:  '[product-materials]',
})

export const DELETE = createSoftDeleteRoute({
  table:     'product_materials',
  logPrefix: '[product-materials]',
})
