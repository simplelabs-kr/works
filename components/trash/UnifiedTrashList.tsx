'use client'

// 통합 휴지통 리스트 — 여러 테이블의 soft-deleted 레코드를 한 화면에서
// 보여주고, 행 단위 복구 버튼만 노출한다. 편집/영구삭제는 각 페이지의
// 전용 UI에서 수행 (여기서는 의도적으로 축소).

import { useCallback, useEffect, useState } from 'react'

type TrashEntry = {
  source: 'order-items' | 'products'
  sourceLabel: string
  id: string
  deleted_at: string | null
  fields: Record<string, string | null>
}

function formatDeletedAt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export default function UnifiedTrashList() {
  const [entries, setEntries] = useState<TrashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringKey, setRestoringKey] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trash', { cache: 'no-store' })
      if (!res.ok) {
        setError('목록을 불러오지 못했습니다')
        setEntries([])
        return
      }
      const body = (await res.json()) as { entries?: TrashEntry[] }
      setEntries(Array.isArray(body.entries) ? body.entries : [])
    } catch {
      setError('목록을 불러오지 못했습니다')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const onRestore = useCallback(async (entry: TrashEntry) => {
    const key = `${entry.source}:${entry.id}`
    setRestoringKey(key)
    try {
      const res = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: entry.source, id: entry.id }),
      })
      if (!res.ok) {
        alert('복구에 실패했습니다')
        return
      }
      // 낙관적 제거.
      setEntries(prev => prev.filter(e => !(e.source === entry.source && e.id === entry.id)))
    } catch {
      alert('복구에 실패했습니다')
    } finally {
      setRestoringKey(null)
    }
  }, [])

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[#111827]">휴지통</h1>
          <p className="mt-1 text-[12px] text-[#6B7280]">
            삭제된 레코드는 여기서 복구할 수 있습니다. 모든 페이지의 삭제 항목이 한 곳에 표시됩니다.
          </p>
        </div>
        <button
          onClick={fetchList}
          className="rounded-[6px] border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] text-[#374151] hover:bg-[#F9FAFB]"
        >
          새로고침
        </button>
      </header>

      {loading && (
        <p className="py-10 text-center text-[13px] text-[#9CA3AF]">로딩 중…</p>
      )}
      {error && !loading && (
        <p className="py-10 text-center text-[13px] text-[#DC2626]">{error}</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="py-10 text-center text-[13px] text-[#9CA3AF]">휴지통이 비어 있습니다.</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <ul className="divide-y divide-[#F1F5F9] rounded-[8px] border border-[#E5E7EB] bg-white">
          {entries.map(entry => {
            const key = `${entry.source}:${entry.id}`
            const restoring = restoringKey === key
            return (
              <li key={key} className="flex items-center gap-4 px-4 py-3">
                <span className="inline-flex min-w-[72px] shrink-0 items-center justify-center rounded-[4px] bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#3730A3]">
                  {entry.sourceLabel}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-1">
                  {Object.entries(entry.fields).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <span className="mr-1 text-[11px] text-[#9CA3AF]">{label}</span>
                      <span className="text-[13px] text-[#111827]">
                        {value && value.length > 0 ? value : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                  {formatDeletedAt(entry.deleted_at)}
                </span>
                <button
                  disabled={restoring}
                  onClick={() => onRestore(entry)}
                  className="shrink-0 rounded-[6px] border border-[#E5E7EB] bg-white px-3 py-1 text-[12px] text-[#374151] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoring ? '복구 중…' : '복구'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
