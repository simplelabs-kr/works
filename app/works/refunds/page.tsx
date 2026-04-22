import dynamic from 'next/dynamic'

// 환불 — Refunds page (Case B 직접 JOIN).
const RefundsGrid = dynamic(() => import('@/components/works/RefundsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function RefundsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <RefundsGrid />
    </div>
  )
}
