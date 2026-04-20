#!/usr/bin/env node
// flat_{table} 스키마로부터 features/{page}/{page}Config.ts + {page}Types.ts
// 초기 스캐폴드를 생성한다. claude.ai 가 flat 테이블을 만든 직후
// Claude Code 가 이 스크립트로 Config 뼈대를 찍고, 작가가 수동으로
// 라벨/폭/렌더러/readOnly 를 다듬는 흐름.
//
// 순수 변환 스크립트 — DB 접근은 하지 않는다. 스키마 JSON 을 stdin 또는
// --schema <file> 로 받는다. 아래 쿼리 결과를 그대로 먹이면 된다.
//
//   SELECT column_name, data_type, udt_name,
//          character_maximum_length, is_nullable
//   FROM   information_schema.columns
//   WHERE  table_schema = 'public' AND table_name = 'flat_{table}'
//   ORDER  BY ordinal_position;
//
// 사용:
//   node scripts/generate-page-config.mjs <page> --schema schema.json
//   pg-query ... | node scripts/generate-page-config.mjs <page>
//   node scripts/generate-page-config.mjs <page> --schema schema.json --write
//
// 출력 (기본 stdout):
//   ===== features/{page}/{page}Types.ts =====
//   ...
//   ===== features/{page}/{page}Config.ts =====
//   ...
// --write 시에는 각 파일로 저장 (기존 파일 덮어쓰기).
//
// 매핑 규칙:
//   boolean                  → fieldType 'checkbox'
//   integer/numeric/real/... → fieldType 'number'
//   date/timestamp*          → fieldType 'date'
//   text (maxLen > 500)      → fieldType 'longtext'
//   text/varchar/char        → fieldType 'text'
//   jsonb/json               → 제외 (특수 컬럼, 수동 처리)
//   uuid                     → 일반적으로 제외 (id/FK)
//
// 제외(기본): id, deleted_at, created_at, updated_at, *_id
// readOnly:true 휴리스틱: 이름이 _목록$, _개수$, _여부$ 로 끝나거나
// 동일 루트 _id 가 존재하는 name 컬럼(예: brand_id 있을 때 브랜드명).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const argv = process.argv.slice(2)
const writeMode = argv.includes('--write')
const schemaIdx = argv.indexOf('--schema')
const schemaPath = schemaIdx >= 0 ? argv[schemaIdx + 1] : null
const pageName = argv.find(a => !a.startsWith('--') && a !== schemaPath)

if (!pageName) {
  console.error('Usage: node scripts/generate-page-config.mjs <page> [--schema <file>] [--write]')
  process.exit(2)
}

// ── 입력 로드 ────────────────────────────────────────────────────────

async function readStdin() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8')
}

let rawJson
if (schemaPath) {
  rawJson = readFileSync(schemaPath, 'utf8')
} else if (!process.stdin.isTTY) {
  rawJson = await readStdin()
} else {
  console.error('schema JSON 이 필요함: --schema <file> 또는 stdin')
  process.exit(2)
}

let columns
try {
  columns = JSON.parse(rawJson)
  if (!Array.isArray(columns)) throw new Error('JSON 이 배열이 아님')
} catch (e) {
  console.error(`schema JSON 파싱 실패: ${e.message}`)
  process.exit(2)
}

// ── 매핑 ─────────────────────────────────────────────────────────────

const SKIP_NAMES = new Set(['id', 'deleted_at', 'created_at', 'updated_at', 'parent_id'])
const SKIP_UDTS = new Set(['jsonb', 'json']) // 수동 처리
const AGGREGATE_SUFFIX = /(_목록|_개수|_여부)$/

// UUID FK 만 스킵 대상. 'slack_thread_id' / '개발_슬랙_id' 처럼 udt 가
// text 인 "id 같은 이름" 의 텍스트 필드는 편집 가능한 일반 컬럼.
function isUuidForeignKey(col) {
  return /_id$/.test(col.column_name) && (col.udt_name || '').toLowerCase() === 'uuid'
}

// FK 이름 대응 휴리스틱: brand_id ↔ 브랜드명 / brand_name
//   brand_id 가 있으면 'brand' prefix 가 붙은 *_name / *_명 / 브랜드명 등은
//   lookup 표시용으로 간주. 완벽하지 않지만 대부분의 케이스 잡음.
const fkRoots = new Set()
for (const c of columns) {
  if (typeof c.column_name !== 'string') continue
  const m = c.column_name.match(/^(.+)_id$/)
  if (m && !SKIP_NAMES.has(c.column_name)) fkRoots.add(m[1])
}

// ── PG type → fieldType ──────────────────────────────────────────────

function toFieldType(col) {
  const udt = (col.udt_name || '').toLowerCase()
  const dt  = (col.data_type || '').toLowerCase()
  if (udt === 'bool' || dt === 'boolean') return 'checkbox'
  if (/^(int2|int4|int8|numeric|float4|float8)$/.test(udt)) return 'number'
  if (/^(date|timestamp|timestamptz)$/.test(udt) || dt.startsWith('timestamp')) return 'date'
  if (udt === 'text' || /^varchar|^bpchar|^char/.test(udt)) {
    const n = Number(col.character_maximum_length)
    if (Number.isFinite(n) && n > 500) return 'longtext'
    return 'text'
  }
  return null
}

function typeScriptType(col, fieldType) {
  if (fieldType === 'checkbox') return 'boolean | null'
  if (fieldType === 'number')   return 'number | null'
  return 'string | null'
}

function defaultWidth(fieldType, name) {
  if (fieldType === 'checkbox') return 80
  if (fieldType === 'number')   return 100
  if (fieldType === 'date')     return 110
  if (fieldType === 'longtext') return 200
  return name.length > 10 ? 160 : 120
}

function defaultMaxLength(fieldType, col) {
  if (fieldType === 'longtext') {
    const n = Number(col.character_maximum_length)
    return Number.isFinite(n) && n > 0 ? n : 2000
  }
  if (fieldType === 'text') {
    const n = Number(col.character_maximum_length)
    return Number.isFinite(n) && n > 0 ? n : 200
  }
  return null
}

// ── 컬럼 분류 ─────────────────────────────────────────────────────────

const grid = []     // 그리드 표시 컬럼
const skipped = []  // 제외된 컬럼 (참고용 주석 출력)

for (const col of columns) {
  const name = col.column_name
  if (typeof name !== 'string' || !name) continue

  if (SKIP_NAMES.has(name)) { skipped.push({ name, reason: '메타' }); continue }
  if (isUuidForeignKey(col)) { skipped.push({ name, reason: 'UUID FK' }); continue }
  if (SKIP_UDTS.has((col.udt_name || '').toLowerCase())) {
    skipped.push({ name, reason: `jsonb — 수동 처리` }); continue
  }

  const fieldType = toFieldType(col)
  if (!fieldType) { skipped.push({ name, reason: `미지 타입 ${col.udt_name}` }); continue }

  // readOnly 추정
  let readOnly = false
  let readOnlyReason = ''
  if (AGGREGATE_SUFFIX.test(name)) {
    readOnly = true; readOnlyReason = '집계/파생 (suffix 휴리스틱)'
  } else {
    // 동일 루트 _id 가 존재하면 name 컬럼은 lookup 으로 추정
    // 예: brand_id 있음 + 브랜드명 → 브랜드명 readOnly 의심
    for (const root of fkRoots) {
      if (name.includes(root) && /[명]$|_name$|_title$/.test(name)) {
        readOnly = true; readOnlyReason = `lookup (FK root "${root}" 대응)`
        break
      }
    }
  }

  grid.push({
    name,
    fieldType,
    readOnly,
    readOnlyReason,
    width: defaultWidth(fieldType, name),
    maxLength: defaultMaxLength(fieldType, col),
    nullable: col.is_nullable === 'YES',
    tsType: typeScriptType(col, fieldType),
  })
}

// ── 네이밍 ───────────────────────────────────────────────────────────

const PAGE = pageName.toUpperCase()
const Page = pageName.charAt(0).toUpperCase() + pageName.slice(1)

// ── 출력 생성 ────────────────────────────────────────────────────────

function emitTypes() {
  const itemLines = []
  // Item 은 flat_{table} 원본 shape — 제외되었더라도 타입엔 포함되는 게
  // 안전 (API 응답에 오면 런타임에 참조될 수 있음).
  for (const col of columns) {
    const name = col.column_name
    if (typeof name !== 'string') continue
    const ft = toFieldType(col)
    let ts
    if (name === 'id') ts = 'string'
    else if ((col.udt_name || '') === 'jsonb') ts = 'unknown'
    else if (ft) ts = typeScriptType(col, ft)
    else ts = 'string | null'
    itemLines.push(`  ${name}: ${ts}`)
  }

  const rowLines = []
  for (const c of grid) {
    // Row 는 HOT display shape — null 없앤 정규화 형태
    let ts
    if (c.fieldType === 'checkbox') ts = 'boolean'
    else if (c.fieldType === 'number') ts = 'number | null'
    else ts = 'string'
    rowLines.push(`  ${c.name}: ${ts}`)
  }

  return `// ${pageName} 페이지 도메인 타입.
// Item: flat_{table} 원본 row. 필드 이름은 물리 컬럼명과 정확히 일치.
// Row : HOT display row. transformRow 가 Item → Row 정규화.

export interface ${Page}Item {
  id: string
  updated_at: string | null
  created_at: string | null
${itemLines.filter(l => !/^\s{2}(id|updated_at|created_at):/.test(l)).join('\n')}
  [key: string]: unknown
}

export interface ${Page}Row {
  id: string
  updated_at: string | null
  created_at: string | null
${rowLines.join('\n')}
  [key: string]: unknown
}
`
}

function emitConfig() {
  const editable = grid.filter(c => !c.readOnly)
  const editableLines = editable.map(c => `  '${c.name}': '${c.name}',`).join('\n')

  const columnLines = grid.map(c => {
    const parts = [
      `data: '${c.name}'`,
      `title: '${c.name}'`,
      `readOnly: ${c.readOnly}`,
      `width: ${c.width}`,
      `fieldType: '${c.fieldType}' as FieldType`,
    ]
    if (c.fieldType === 'number')   parts.push(`type: 'numeric'`)
    if (c.fieldType === 'longtext') parts.push(`type: 'text'`)
    if (c.fieldType === 'checkbox') parts.push(`editor: false`, `renderer: checkboxRenderer`)
    if (c.maxLength != null && (c.fieldType === 'text' || c.fieldType === 'longtext')) {
      parts.push(`maxLength: ${c.maxLength}`)
    }
    const line = `  { ${parts.join(', ')} },`
    return c.readOnly && c.readOnlyReason
      ? `  // ${c.readOnlyReason}\n${line}`
      : line
  }).join('\n')

  const transformLines = grid.map(c => {
    if (c.fieldType === 'checkbox') return `    ${c.name}: item.${c.name} === true,`
    if (c.fieldType === 'number')   return `    ${c.name}: item.${c.name} ?? null,`
    return `    ${c.name}: item.${c.name} ?? '',`
  }).join('\n')

  const mergeLines = editable.map(c => {
    if (c.fieldType === 'checkbox') return `    ${c.name}: n.${c.name} !== undefined ? n.${c.name} === true : prev.${c.name},`
    if (c.fieldType === 'number')   return `    ${c.name}: n.${c.name} !== undefined ? (n.${c.name} == null ? null : Number(n.${c.name})) : prev.${c.name},`
    return `    ${c.name}: n.${c.name} !== undefined ? String(n.${c.name} ?? '') : prev.${c.name},`
  }).join('\n')

  const skippedComment = skipped.length > 0
    ? `\n// 제외된 컬럼(참고): ${skipped.map(s => `${s.name}(${s.reason})`).join(', ')}\n`
    : ''

  return `// ${pageName} 페이지 설정.
// generate-page-config.mjs 로 생성된 스캐폴드 — 라벨/폭/렌더러/readOnly 를
// 상황에 맞게 다듬어 쓴다. 한 번 다듬은 후에는 이 파일을 재생성하지 말 것
// (수동 편집 유실).
${skippedComment}
import type { FieldType } from '@/features/works/worksTypes'
import type { PageConfig } from '@/components/datagrid/types'
import { checkboxRenderer } from '@/features/works/worksRenderers'
import type { ${Page}Item, ${Page}Row } from './${pageName}Types'

export const ${PAGE}_VIEW_PAGE_KEY = '${pageName}'

// Row 필드명 → 실제 테이블 컬럼명. PATCH 가 허용하는 컬럼과 정확히 일치.
// lookup(JOIN) / formula / 집계 컬럼은 여기에 포함하지 말 것.
export const ${PAGE}_EDITABLE_FIELDS: Record<string, string> = {
${editableLines}
}

export const ${PAGE}_COLUMNS = [
${columnLines}
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ${PAGE}_COL_HEADERS: string[] = (${PAGE}_COLUMNS as any[]).map((c) => c.title ?? '')

function transform${Page}Row(item: ${Page}Item): ${Page}Row {
  return {
    id: item.id,
    updated_at: item.updated_at ?? null,
    created_at: item.created_at ?? null,
${transformLines}
  }
}

function ${pageName}MergeRealtimeUpdate(
  prev: ${Page}Row,
  payloadNew: Record<string, unknown>,
): ${Page}Row {
  const n = payloadNew as Record<string, any>  // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    ...prev,
${mergeLines}
    updated_at: n.updated_at !== undefined ? (n.updated_at as string | null) : prev.updated_at,
  }
}

export const ${pageName}PageConfig: PageConfig<${Page}Item, ${Page}Row> = {
  pageKey: ${PAGE}_VIEW_PAGE_KEY,
  pageName: '${pageName}',
  apiBase: '/api/${pageName}',
  realtimeChannel: '${pageName}_changes',
  realtimeTable: '${pageName}',
  selectOptionsTable: '${pageName}',
  columns: ${PAGE}_COLUMNS,
  colHeaders: ${PAGE}_COL_HEADERS,
  editableFields: ${PAGE}_EDITABLE_FIELDS,
  transformRow: transform${Page}Row,
  mergeRealtimeUpdate: ${pageName}MergeRealtimeUpdate,
  addRow: { enabled: true },
  viewTypes: ['grid'],
  // 초기 데이터 규모가 크면 'require-filter' 로 바꿔 필터 설정 전엔 비어있게.
  initialLoadPolicy: 'auto',
}
`
}

// ── 출력 ────────────────────────────────────────────────────────────

const typesSrc  = emitTypes()
const configSrc = emitConfig()

if (writeMode) {
  const outDir = resolve(REPO_ROOT, `features/${pageName}`)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, `${pageName}Types.ts`),  typesSrc)
  writeFileSync(resolve(outDir, `${pageName}Config.ts`), configSrc)
  console.log(`wrote ${outDir}/${pageName}Types.ts`)
  console.log(`wrote ${outDir}/${pageName}Config.ts`)
} else {
  console.log(`===== features/${pageName}/${pageName}Types.ts =====`)
  console.log(typesSrc)
  console.log(`===== features/${pageName}/${pageName}Config.ts =====`)
  console.log(configSrc)
}

if (skipped.length > 0) {
  console.error(`[info] 제외된 컬럼 ${skipped.length}개: ${skipped.map(s => `${s.name}(${s.reason})`).join(', ')}`)
}
