'use client'

// Select 컬럼 옵션 관리 모달.
//
// Airtable 스타일의 옵션 패널: 값 추가/삭제/수정 + 색상 선택 + 순서 변경.
// 저장 시 `PUT /api/field-options` 로 현재 상태 전체를 전송 (replace 시맨틱).
// 부모 (DataGrid) 는 성공 후 콜백으로 최신 카탈로그를 받아 `setSelectColumnOptions`
// 로 하이드레이션 후 HOT 를 다시 렌더한다.

import { useEffect, useRef, useState } from 'react'

export type OptionItem = { value: string; bg: string }

interface Props {
  tableName: string
  fieldName: string
  columnLabel: string
  initial: OptionItem[]
  onSaved: (next: OptionItem[]) => void
  onClose: () => void
}

// Airtable-style palette — 12 families × 5 shades = 60 colors.
// 각 계열은 dark → light 순으로 5단계.
const COLOR_PALETTE: string[] = [
  // 빨강 계열
  '#9e2a2b', '#c0392b', '#e74c3c', '#f1948a', '#fadbd8',
  // 주황 계열
  '#935116', '#d35400', '#e67e22', '#f0b27a', '#fdebd0',
  // 노랑 계열
  '#7d6608', '#b7950b', '#f1c40f', '#f7dc6f', '#fef9e7',
  // 초록 계열
  '#1e8449', '#27ae60', '#58d68d', '#a9dfbf', '#d5f5e3',
  // 청록 계열
  '#117a65', '#1abc9c', '#48c9b0', '#a2d9ce', '#d1f2eb',
  // 파랑 계열
  '#1a5276', '#2980b9', '#5dade2', '#aed6f1', '#d6eaf8',
  // 남색/인디고 계열
  '#1b2a4a', '#2e4057', '#5b7fa6', '#a9c4e4', '#dceefb',
  // 보라 계열
  '#6c3483', '#8e44ad', '#bb8fce', '#d7bde2', '#f4ecf7',
  // 분홍 계열
  '#922b21', '#c0392b', '#e91e8c', '#f48fb1', '#fce4ec',
  // 회색 계열
  '#212121', '#616161', '#9e9e9e', '#e0e0e0', '#f5f5f5',
  // 갈색 계열
  '#4e342e', '#795548', '#a1887f', '#d7ccc8', '#efebe9',
  // 청회색 계열
  '#263238', '#546e7a', '#90a4ae', '#cfd8dc', '#eceff1',
]

function nextPaletteColor(existing: OptionItem[]): string {
  // 이미 사용한 색은 마지막으로 밀어 순환하듯 다음 색을 추천.
  const used = new Set(existing.map((o) => o.bg).filter(Boolean))
  for (const c of COLOR_PALETTE) {
    if (!used.has(c)) return c
  }
  return COLOR_PALETTE[existing.length % COLOR_PALETTE.length]
}

export default function FieldOptionsModal({
  tableName,
  fieldName,
  columnLabel,
  initial,
  onSaved,
  onClose,
}: Props) {
  const [items, setItems] = useState<OptionItem[]>(() => initial.map((o) => ({ ...o })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paletteOpenIdx, setPaletteOpenIdx] = useState<number | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const dragFromRef = useRef<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC / backdrop close
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [onClose])

  const addItem = () => {
    const v = draftValue.trim()
    if (!v) return
    if (items.some((it) => it.value === v)) {
      setError(`"${v}" 는 이미 존재하는 옵션입니다`)
      return
    }
    setItems((prev) => [...prev, { value: v, bg: nextPaletteColor(prev) }])
    setDraftValue('')
    setError(null)
  }

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    setPaletteOpenIdx(null)
  }

  const updateValue = (idx: number, newValue: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, value: newValue } : it)))
  }

  const updateColor = (idx: number, color: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, bg: color } : it)))
    setPaletteOpenIdx(null)
  }

  const moveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleSave = async () => {
    // 중복/빈값 검증
    const seen = new Set<string>()
    for (const it of items) {
      const v = it.value.trim()
      if (!v) {
        setError('빈 값이 있는 옵션이 있습니다')
        return
      }
      if (seen.has(v)) {
        setError(`중복된 값: "${v}"`)
        return
      }
      seen.add(v)
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/field-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: tableName,
          field_name: fieldName,
          options: items.map((it, i) => ({
            value: it.value.trim(),
            color: it.bg || null,
            sort_order: i,
          })),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `저장 실패 (${res.status})`)
      }
      const body = (await res.json()) as { data: OptionItem[] }
      onSaved(body.data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-[8px] shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
        style={{ width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>옵션 관리</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{columnLabel}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 20,
              color: '#9CA3AF',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Options list */}
        <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
          {items.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              옵션이 없습니다. 아래에서 추가하세요.
            </div>
          )}
          {items.map((it, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => {
                dragFromRef.current = idx
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragFromRef.current !== null) moveItem(dragFromRef.current, idx)
                dragFromRef.current = null
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 4px',
                borderRadius: 4,
                position: 'relative',
              }}
            >
              <span
                title="드래그로 순서 변경"
                style={{
                  cursor: 'grab',
                  color: '#9CA3AF',
                  fontSize: 14,
                  width: 14,
                  textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                ⋮⋮
              </span>
              <button
                aria-label="색상 선택"
                onClick={() => setPaletteOpenIdx(paletteOpenIdx === idx ? null : idx)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: '1px solid #E5E7EB',
                  background: it.bg || '#F3F4F6',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: 0,
                }}
              />
              <input
                value={it.value}
                onChange={(e) => updateValue(idx, e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid #E5E7EB',
                  borderRadius: 4,
                  padding: '5px 8px',
                  fontSize: 13,
                  color: '#111827',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => removeItem(idx)}
                aria-label="옵션 삭제"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: 16,
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              {paletteOpenIdx === idx && (
                <div
                  style={{
                    position: 'absolute',
                    top: 30,
                    left: 30,
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    padding: 8,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 20px)',
                    gap: 4,
                    zIndex: 1,
                  }}
                >
                  {COLOR_PALETTE.map((c, ci) => {
                    const selected = it.bg === c
                    return (
                      <button
                        key={`${c}-${ci}`}
                        onClick={() => updateColor(idx, c)}
                        aria-label={`색상 ${c}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: 'none',
                          background: c,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 12,
                          lineHeight: 1,
                          fontWeight: 700,
                          transition: 'transform 120ms ease',
                        }}
                      >
                        {selected ? '✓' : ''}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add row */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: 6,
          }}
        >
          <input
            placeholder="새 옵션 값"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
            style={{
              flex: 1,
              border: '1px solid #E5E7EB',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 13,
              color: '#111827',
              outline: 'none',
            }}
          />
          <button
            onClick={addItem}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            추가
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '8px 14px',
              color: '#DC2626',
              fontSize: 12,
              borderTop: '1px solid #FECACA',
              background: '#FEF2F2',
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: '1px solid #E2E8F0',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              color: '#111827',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#2563EB',
              border: '1px solid #2563EB',
              borderRadius: 4,
              padding: '6px 16px',
              fontSize: 13,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
