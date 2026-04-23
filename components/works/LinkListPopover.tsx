'use client'

// Linklist 컬럼 전용 팝오버.
//
// 상단: 현재 연결된 chip 목록 (X 버튼으로 해제).
// 하단: 검색 input + 후보 목록 (+ 버튼으로 연결).
//
// 정방향 (mode='forward', N=1):
//   - 선택 시 현재 row 의 `fkColumn` 을 해당 id 로 PATCH
//   - 이미 연결된 상태에서 새 후보 선택 → 교체
//   - X 클릭 → `fkColumn` 을 null 로 PATCH
//
// 역방향 (mode='reverse', N≥0):
//   - 추가 시 상대 테이블의 row 를 `reverseFkColumn = currentId` 로 PATCH
//   - 제거 시 상대 row 의 `reverseFkColumn` 을 null 로 PATCH
//
// 실제 네트워크 호출 / optimistic update 는 호출측 (DataGrid) 이 담당.
// 팝오버는 "사용자 의도" 만 onAdd / onRemove 콜백으로 전달.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LinkListChip } from '@/features/works/linkListRenderer'

interface Props {
  top: number
  left: number
  width: number

  // 현재 연결된 chip 들 (부모가 row 데이터에서 추출해 전달).
  connected: LinkListChip[]

  // 후보 검색을 띄울 엔드포인트 (예: '/api/order_items').
  endpoint: string
  idField?: string
  displayField: string
  secondaryField?: string
  placeholder?: string

  // N=1 모드면 true — 후보 선택 시 기존 연결을 자동으로 교체.
  singleSelect?: boolean

  onAdd: (picked: LinkListChip) => void
  onRemove: (chipId: string) => void
  onClose: () => void
}

const DEBOUNCE_MS = 250

export default function LinkListPopover({
  top,
  left,
  width,
  connected,
  endpoint,
  idField = 'id',
  displayField,
  secondaryField,
  placeholder,
  singleSelect = false,
  onAdd,
  onRemove,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LinkListChip[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const reqSeqRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

  const connectedIds = useMemo(() => new Set(connected.map((c) => c.id)), [connected])

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
          const mapped: LinkListChip[] = rows.slice(0, 40).map((r) => ({
            id: String(r[idField] ?? ''),
            display: String(r[displayField] ?? ''),
            secondary:
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

  useEffect(() => {
    debouncedFetch(query)
  }, [query, debouncedFetch])

  const handleAdd = (chip: LinkListChip) => {
    if (singleSelect) {
      // N=1 모드: 기존 연결이 있으면 제거 후 교체.
      connected.forEach((c) => {
        if (c.id !== chip.id) onRemove(c.id)
      })
    }
    onAdd(chip)
    if (singleSelect) onClose()
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="링크 목록"
      style={{
        position: 'fixed',
        top,
        left,
        width: Math.max(width, 260),
        zIndex: 10000,
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 380,
      }}
    >
      {/* Connected chips */}
      {connected.length > 0 && (
        <div
          style={{
            padding: 8,
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {connected.map((c) => (
            <span
              key={c.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 4px 2px 8px',
                borderRadius: 10,
                background: '#EEF2FF',
                color: '#3730A3',
                fontSize: 12,
                lineHeight: 1.4,
              }}
              title={c.secondary ? `${c.display}\n${c.secondary}` : c.display}
            >
              <span
                style={{
                  maxWidth: 160,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.display || '(값 없음)'}
              </span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  onRemove(c.id)
                }}
                aria-label={`${c.display} 연결 해제`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#6366F1',
                  padding: 0,
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#C7D2FE')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
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

      {/* Candidate list */}
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
          results.map((r) => {
            const already = connectedIds.has(r.id)
            return (
              <button
                key={r.id}
                disabled={already && !singleSelect}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (already && !singleSelect) return
                  handleAdd(r)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: already && !singleSelect ? 'default' : 'pointer',
                  opacity: already && !singleSelect ? 0.5 : 1,
                  borderBottom: '1px solid #F8FAFC',
                }}
                onMouseEnter={(e) => {
                  if (!(already && !singleSelect))
                    e.currentTarget.style.background = '#F8FAFC'
                }}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#111827',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.display || '(값 없음)'}
                  </div>
                  {r.secondary && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#6B7280',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.secondary}
                    </div>
                  )}
                </span>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    color: already ? '#9CA3AF' : '#4F46E5',
                    flexShrink: 0,
                  }}
                >
                  {already ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <line x1="6" y1="2" x2="6" y2="10" />
                      <line x1="2" y1="6" x2="10" y2="6" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
      </div>
    </div>
  )
}
