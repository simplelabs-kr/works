// PageConfig 런타임 validator.
//
// DataGrid 가 마운트 시점에 1회 실행해 Config 의 구조 오류 / 드리프트를
// 콘솔로 보고한다. 목표는 "데이터 조회 실패" / "PATCH 403" 같은
// 런타임 에러가 나기 전에 Config 레벨에서 조기 탐지하는 것.
//
// 에러 / 경고 수준:
//   error: 페이지가 동작할 수 없는 수준 (필수 필드 누락, 중복 data 키 등).
//   warn : 동작은 하지만 드리프트 가능성 있음 (readOnly ↔ editableFields 불일치 등).
//
// 이 파일은 side-effect 없음 — `validatePageConfig(cfg)` 는 구조화된
// 결과를 반환하고, 로그 출력은 호출측에서 한다.

import type { PageConfig } from './types'

export type ValidationIssue = {
  level: 'error' | 'warn'
  message: string
  detail?: unknown
}

export type ValidationResult = {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

function requireString(
  out: ValidationIssue[],
  obj: Record<string, unknown>,
  key: string,
) {
  const v = obj[key]
  if (typeof v !== 'string' || v === '') {
    out.push({ level: 'error', message: `pageConfig.${key} 누락 또는 빈 문자열` })
  }
}

export function validatePageConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfg: PageConfig<any, any>,
): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // 1) 필수 스트링 필드
  const cfgRec = cfg as unknown as Record<string, unknown>
  for (const key of ['pageKey', 'apiBase', 'realtimeChannel', 'realtimeTable', 'selectOptionsTable']) {
    requireString(errors, cfgRec, key)
  }

  // 2) columns 기본 형태
  const columns = Array.isArray(cfg.columns) ? cfg.columns : []
  if (columns.length === 0) {
    errors.push({ level: 'error', message: 'pageConfig.columns 가 비어있음' })
  }

  const dataSeen = new Map<string, number>()   // data → first index
  const titleSeen = new Map<string, number>()

  columns.forEach((col, i) => {
    const data = (col as { data?: unknown })?.data
    const title = (col as { title?: unknown })?.title
    if (typeof data !== 'string' || data === '') {
      errors.push({ level: 'error', message: `columns[${i}].data 누락 또는 빈 문자열`, detail: col })
      return
    }
    // 중복 data → 치명적. HOT 은 같은 prop 을 두 컬럼에 연결하면
    // 한쪽 편집이 다른 쪽에 누수된다.
    if (dataSeen.has(data)) {
      errors.push({
        level: 'error',
        message: `columns[${i}].data "${data}" 중복 — 앞서 ${dataSeen.get(data)} 에서 사용됨`,
      })
    } else {
      dataSeen.set(data, i)
    }
    if (typeof title === 'string' && title !== '') {
      if (titleSeen.has(title)) {
        warnings.push({
          level: 'warn',
          message: `columns[${i}].title "${title}" 중복 — FilterModal/SortModal 드롭다운에서 구분 불가 (앞서 ${titleSeen.get(title)})`,
        })
      } else {
        titleSeen.set(title, i)
      }
    }
  })

  // 3) colHeaders ↔ columns 길이 일치
  if (Array.isArray(cfg.colHeaders) && cfg.colHeaders.length !== columns.length) {
    warnings.push({
      level: 'warn',
      message: `colHeaders.length(${cfg.colHeaders.length}) ≠ columns.length(${columns.length})`,
    })
  }

  // 4) editableFields ↔ columns 상호 점검
  const editable = (cfg.editableFields ?? {}) as Record<string, string>
  const editableKeys = Object.keys(editable)

  for (const key of editableKeys) {
    if (!dataSeen.has(key)) {
      warnings.push({
        level: 'warn',
        message: `editableFields["${key}"] 에 대응하는 column 없음 — API-only FK 편집이면 의도된 것. 그 외엔 드리프트`,
      })
    }
  }

  columns.forEach((col, i) => {
    const data = (col as { data?: unknown })?.data
    const readOnly = (col as { readOnly?: unknown })?.readOnly
    if (typeof data !== 'string' || data === '') return
    if (readOnly === false && !(data in editable)) {
      warnings.push({
        level: 'warn',
        message: `columns[${i}] "${data}" 는 readOnly:false 인데 editableFields 에 미등록 — 편집 UI 는 열리지만 PATCH 403 발생`,
      })
    }
  })

  // 5) 필수 함수 존재
  if (typeof cfg.transformRow !== 'function') {
    errors.push({ level: 'error', message: 'pageConfig.transformRow 누락' })
  }
  if (typeof cfg.mergeRealtimeUpdate !== 'function') {
    errors.push({ level: 'error', message: 'pageConfig.mergeRealtimeUpdate 누락' })
  }

  return { errors, warnings }
}

// ── 콘솔 리포터 ───────────────────────────────────────────────────────

export function reportValidation(
  pageKey: string,
  result: ValidationResult,
): void {
  if (result.errors.length === 0 && result.warnings.length === 0) return
  const prefix = `[pageConfig:${pageKey}]`
  for (const e of result.errors)   console.error(`${prefix} ERROR: ${e.message}`, e.detail ?? '')
  for (const w of result.warnings) console.warn(`${prefix} WARN: ${w.message}`,  w.detail ?? '')
}
