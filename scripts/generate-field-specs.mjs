#!/usr/bin/env node
// features/{page}/{page}Config.ts 를 읽어 app/api/{page}/[id]/route.ts 의
// FIELD_SPECS 블록을 생성한다. EDITABLE_FIELDS ↔ FIELD_SPECS 수작업 동기화
// (3중 드리프트) 를 제거하는 것이 목적.
//
// 사용:
//   node scripts/generate-field-specs.mjs <page>            # stdout 으로 출력
//   node scripts/generate-field-specs.mjs <page> --write    # route.ts 에 직접 패치
//   node scripts/generate-field-specs.mjs <page> --check    # 현재 route.ts 와 diff
//
// 입력:
//   features/{page}/{page}Config.ts
//     export const {PAGE}_EDITABLE_FIELDS: Record<string,string> = { ... }
//     export const {PAGE}_COLUMNS = [ { data, title, fieldType, ...(maxLength?) }, ... ]
//
// 매핑:
//   fieldType === 'number'   → { type: 'number' }
//   fieldType === 'checkbox' → { type: 'boolean' }
//   fieldType === 'date'     → { type: 'date' }
//   fieldType === 'longtext' → { type: 'text', maxLength: col.maxLength ?? 2000 }
//   fieldType === 'select'   → { type: 'text', maxLength: col.maxLength ?? 50 }
//   fieldType === 'text'|default → { type: 'text', maxLength: col.maxLength ?? 200 }
//
// 주의: 컬럼 카탈로그에 `maxLength` 를 붙이면 해당 값이 반영된다.
// 현재 `DataGridColumn = any` 이므로 추가 필드를 정의해도 타입에러 없음.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const argv = process.argv.slice(2)
const writeMode = argv.includes('--write')
const checkMode = argv.includes('--check')
const pageName = argv.find(a => !a.startsWith('--'))

if (!pageName) {
  console.error('Usage: node scripts/generate-field-specs.mjs <page> [--write | --check]')
  process.exit(2)
}

const configPath = resolve(REPO_ROOT, `features/${pageName}/${pageName}Config.ts`)
const routePath  = resolve(REPO_ROOT, `app/api/${pageName}/[id]/route.ts`)

if (!existsSync(configPath)) {
  console.error(`config not found: ${configPath}`)
  process.exit(2)
}

const sf = ts.createSourceFile(
  configPath,
  readFileSync(configPath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
)

// ── AST 파싱 헬퍼 ─────────────────────────────────────────────────────

function unwrap(node) {
  let n = node
  while (
    n && (
      ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isTypeAssertionExpression?.(n)
    )
  ) n = n.expression
  return n
}

function literalValue(node) {
  const v = unwrap(node)
  if (!v) return undefined
  if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) return v.text
  if (ts.isNumericLiteral(v)) return Number(v.text)
  if (v.kind === ts.SyntaxKind.TrueKeyword)  return true
  if (v.kind === ts.SyntaxKind.FalseKeyword) return false
  if (v.kind === ts.SyntaxKind.NullKeyword)  return null
  return undefined
}

function propKey(prop) {
  const k = prop.name
  if (ts.isStringLiteral(k) || ts.isNoSubstitutionTemplateLiteral(k)) return k.text
  if (ts.isIdentifier(k) || ts.isPrivateIdentifier(k)) return k.text
  if (ts.isComputedPropertyName(k)) {
    const v = literalValue(k.expression)
    return typeof v === 'string' ? v : undefined
  }
  return undefined
}

// ── EDITABLE_FIELDS / COLUMNS 추출 ────────────────────────────────────

let editableKeys = null
const columnsByData = new Map()

for (const stmt of sf.statements) {
  if (!ts.isVariableStatement(stmt)) continue
  for (const decl of stmt.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || !decl.initializer) continue
    const name = decl.name.text
    const init = unwrap(decl.initializer)

    if (/EDITABLE_FIELDS$/.test(name) && ts.isObjectLiteralExpression(init)) {
      editableKeys = []
      for (const p of init.properties) {
        if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue
        const k = propKey(p)
        if (typeof k === 'string') editableKeys.push(k)
      }
    }

    if (/COLUMNS$/.test(name) && ts.isArrayLiteralExpression(init)) {
      for (const el of init.elements) {
        const obj = unwrap(el)
        if (!ts.isObjectLiteralExpression(obj)) continue
        const rec = {}
        for (const p of obj.properties) {
          if (!ts.isPropertyAssignment(p)) continue
          const k = propKey(p)
          if (!k) continue
          const v = literalValue(p.initializer)
          if (v !== undefined) rec[k] = v
        }
        if (typeof rec.data === 'string') columnsByData.set(rec.data, rec)
      }
    }
  }
}

if (!editableKeys) {
  console.error(`[${pageName}] *_EDITABLE_FIELDS 를 찾지 못함`)
  process.exit(2)
}
if (columnsByData.size === 0) {
  console.error(`[${pageName}] *_COLUMNS 를 찾지 못함`)
  process.exit(2)
}

// ── FIELD_SPECS 블록 생성 ─────────────────────────────────────────────

const FIELD_SPECS_RE = /const FIELD_SPECS:\s*FieldSpecs\s*=\s*\{[\s\S]*?\n\}/

function specLiteral(fieldType, maxLength) {
  switch (fieldType) {
    case 'number':   return `{ type: 'number' }`
    case 'checkbox': return `{ type: 'boolean' }`
    case 'date':     return `{ type: 'date' }`
    case 'longtext': return `{ type: 'text', maxLength: ${maxLength ?? 2000} }`
    case 'select':   return `{ type: 'text', maxLength: ${maxLength ?? 50} }`
    case 'text':
    default:         return `{ type: 'text', maxLength: ${maxLength ?? 200} }`
  }
}

// 현재 route.ts 의 FIELD_SPECS 를 파싱해 둠 — COLUMNS 엔트리가 없는
// API-only 필드(예: lookup FK 편집용 brand_id) 는 이 기존 라인을 그대로
// 보존해서 수작업 maxLength 튜닝이 유실되지 않게 한다.
const existingSpecLines = new Map()
if (existsSync(routePath)) {
  const curSrc = readFileSync(routePath, 'utf8')
  const m = curSrc.match(FIELD_SPECS_RE)
  if (m) {
    const inner = m[0].replace(/^[^{]*\{/, '').replace(/\}\s*$/, '')
    const lineRe = /^\s*['"]([^'"]+)['"]\s*:\s*(\{[^}]*\})\s*,?/gm
    let mm
    while ((mm = lineRe.exec(inner)) !== null) {
      existingSpecLines.set(mm[1], mm[2])
    }
  }
}

const warnings = []
const bodyLines = []
for (const key of editableKeys) {
  const col = columnsByData.get(key)
  if (!col) {
    const preserved = existingSpecLines.get(key)
    if (preserved) {
      bodyLines.push(`  '${key}': ${preserved},`)
    } else {
      warnings.push(`EDITABLE_FIELDS 키 "${key}" 에 대응하는 COLUMNS 엔트리 없음 — default text/200 로 출력`)
      bodyLines.push(`  '${key}': { type: 'text', maxLength: 200 }, // TODO: COLUMNS 에 대응 없음`)
    }
    continue
  }
  const ft = typeof col.fieldType === 'string' ? col.fieldType : 'text'
  if (col.readOnly === true) {
    warnings.push(`"${key}" 은 COLUMNS 에서 readOnly:true 인데 EDITABLE_FIELDS 에 등록되어 있음`)
  }
  bodyLines.push(`  '${key}': ${specLiteral(ft, col.maxLength)},`)
}

// 반대 방향 경고: COLUMNS 에 readOnly:false 인데 EDITABLE_FIELDS 에 없으면 누락 의심
for (const [data, col] of columnsByData) {
  if (col.readOnly === false && !editableKeys.includes(data)) {
    warnings.push(`"${data}" 은 COLUMNS 에서 readOnly:false 인데 EDITABLE_FIELDS 에 미등록 — 편집 UI 는 열리지만 PATCH 시 403`)
  }
}

const generated = `const FIELD_SPECS: FieldSpecs = {\n${bodyLines.join('\n')}\n}`

// ── 출력 / 쓰기 / 검사 ────────────────────────────────────────────────

for (const w of warnings) console.error(`[warn] ${w}`)

if (checkMode) {
  if (!existsSync(routePath)) {
    console.error(`route not found: ${routePath}`)
    process.exit(2)
  }
  const cur = readFileSync(routePath, 'utf8')
  const m = cur.match(FIELD_SPECS_RE)
  if (!m) {
    console.error(`FIELD_SPECS 블록을 찾지 못함: ${routePath}`)
    process.exit(2)
  }
  // 공백/콤마 정규화 후 비교
  const norm = s => s.replace(/\s+/g, ' ').replace(/,\s*\}/g, ' }').trim()
  if (norm(m[0]) === norm(generated)) {
    console.log(`[${pageName}] FIELD_SPECS in sync`)
    process.exit(0)
  }
  console.error(`[${pageName}] FIELD_SPECS drift detected`)
  console.error('--- current ---')
  console.error(m[0])
  console.error('--- generated ---')
  console.error(generated)
  process.exit(1)
}

if (writeMode) {
  if (!existsSync(routePath)) {
    console.error(`route not found: ${routePath}`)
    process.exit(2)
  }
  const cur = readFileSync(routePath, 'utf8')
  if (!FIELD_SPECS_RE.test(cur)) {
    console.error(`FIELD_SPECS 블록을 찾지 못함: ${routePath}`)
    process.exit(2)
  }
  writeFileSync(routePath, cur.replace(FIELD_SPECS_RE, generated))
  console.log(`wrote ${routePath}`)
  process.exit(0)
}

console.log(generated)
