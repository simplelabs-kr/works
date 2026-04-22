import dynamic from 'next/dynamic'

// 대여 — Rentals page (Case B 직접 JOIN). Handsontable 이 window 를
// 참조하므로 SSR 비활성화.
const RentalsGrid = dynamic(() => import('@/components/works/RentalsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function RentalsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <RentalsGrid />
    </div>
  )
}
