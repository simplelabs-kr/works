'use client'

import { useEffect } from 'react'

type Props = {
  onClose: () => void
}

// Detect macOS to show ⌘ vs Ctrl in shortcut labels.
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform)
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Mod', 'Z'], label: '실행 취소' },
  { keys: ['Mod', 'Shift', 'Z'], label: '다시 실행' },
  { keys: ['Shift', 'Click'], label: '범위 선택 (No. 컬럼 체크박스)' },
  { keys: ['Mod', 'Enter'], label: '필터 적용 (필터 모달 열린 상태)' },
  { keys: ['Delete'], label: '선택 셀 삭제' },
]

export default function ShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mod = isMac() ? '⌘' : 'Ctrl'

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="키보드 단축키"
        className="w-[360px] rounded-[8px] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#0F172A]">키보드 단축키</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[18px] leading-none text-[#9CA3AF] hover:text-[#111827]"
          >
            ×
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between text-[12px]">
              <span className="text-[#374151]">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="min-w-[24px] rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] px-[6px] py-[2px] text-center font-mono text-[11px] text-[#374151]"
                  >
                    {k === 'Mod' ? mod : k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
