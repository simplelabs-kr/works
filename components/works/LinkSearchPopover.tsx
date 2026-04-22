'use client'

// 링크 컬럼 전용 검색 팝오버.
// 셀 클릭 시 cell 주변에 떠서 `linkTable` 의 목록을 실시간 검색.
// 행 하나를 선택하면 onSelect 로 { id, displayValue, secondaryValue }
// 를 넘긴다. 실제 PATCH / optimistic update 는 호출측에서 수행.

import { useEffect, useMemo, useRef, useState } from 'react'

export type LinkCandidate = {
  id: string
  displayValue: string
  secondaryValue?: string
}

interface Props {
  top: number
  left: number
  width: number
  // POST 할 엔드포인트 (예: '/api/products')
  endpoint: string
  // 결과 row 에서 id 로 쓸 필드명 (보통 'id')
  idField?: string
  // 표시 1줄 / 2줄
  displayField: string
  secondaryField?: string
  placeholder?: string
  onSelect: (picked: LinkCandidate) => void
  onClose: () => void
}

const DEBOUNCE_MS = 250

export default function LinkSearchPopover({
  top,
  left,
  width,
  endpoint,
  idField = 'id',
  displayField,
  secondaryField,
  placeholder,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LinkCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const reqSeqRef = useRef(0)

  // 마운트 시 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 바깥 클릭 / ESC → 닫기
  useEffect(() => {
    const md = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', md, true)
    document.addEventListener('keydown', kd)
    return () => {
      document.removeEventListener('mousedown', md, true)
      document.removeEventListener('keydown', kd)
    }
  }, [onClose])

  const debouncedFetch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return (q: string) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        const seq = ++reqSeqRef.current
        setLoading(true)
        setErr(null)
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: { logic: 'AND', conditions: [] },
              sorts: [],
              search_term: q,
              offset: 0,
            }),
          })
          if (!res.ok) throw new Error(`검색 실패 (${res.status})`)
          const body = (await res.json()) as { data?: Record<string, unknown>[] }
          if (reqSeqRef.current !== seq) return
          const rows = body.data ?? []
          const mapped: LinkCandidate[] = rows.slice(0, 30).map((r) => ({
            id: String(r[idField] ?? ''),
            displayValue: String(r[displayField] ?? ''),
            secondaryValue:
              secondaryField && r[secondaryField] != null
                ? String(r[secondaryField])
                : undefined,
          }))
          setResults(mapped)
        } catch (e) {
          if (reqSeqRef.current !== seq) return
          setErr(e instanceof Error ? e.message : '검색 중 오류')
          setResults([])
        } finally {
          if (reqSeqRef.current === seq) setLoading(false)
        }
      }, DEBOUNCE_MS)
    }
  }, [endpoint, idField, displayField, secondaryField])

  // 쿼리 변경 시 검색
  useEffect(() => {
    debouncedFetch(query)
  }, [query, debouncedFetch])

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="링크 검색"
      style={{
        position: 'fixed',
        top,
        left,
        width: Math.max(width, 240),
        zIndex: 10000,
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 320,
      }}
    >
      <div style={{ padding: 8, borderBottom: '1px solid #F1F5F9' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? '검색어 입력…'}
          style={{
            width: '100%',
            border: '1px solid #E5E7EB',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 13,
            color: '#111827',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>
            검색 중…
          </div>
        )}
        {!loading && err && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#DC2626' }}>
            {err}
          </div>
        )}
        {!loading && !err && results.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>
            결과가 없습니다
          </div>
        )}
        {!loading &&
          !err &&
          results.map((r) => (
            <button
              key={r.id}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(r)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: '1px solid #F8FAFC',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>
                {r.displayValue || '(값 없음)'}
              </div>
              {r.secondaryValue && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {r.secondaryValue}
                </div>
              )}
            </button>
          ))}
      </div>
    </div>
  )
}
