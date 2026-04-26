import dynamic from 'next/dynamic'

// 발주 — Orders page, backed by OrdersGrid (orders 테이블 +
// search_flat_orders RPC). Handsontable 이 window 를 참조하므로 SSR
// 비활성화하고 동적 임포트.
const OrdersGrid = dynamic(() => import('@/components/works/OrdersGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function OrdersPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <OrdersGrid />
    </div>
  )
}
