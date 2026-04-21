import dynamic from 'next/dynamic'

// 수선 관리 — Repairs page, backed by RepairsGrid (repairs 테이블 +
// search_flat_repairs RPC). Handsontable 이 window 를 참조하므로 SSR
// 비활성화하고 동적 임포트.
const RepairsGrid = dynamic(() => import('@/components/works/RepairsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function RepairsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <RepairsGrid />
    </div>
  )
}
