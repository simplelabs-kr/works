import dynamic from 'next/dynamic'

// 제품 관리 — Products page, backed by ProductsGrid (products 테이블 +
// search_products RPC JOIN). Handsontable이 window를 참조하므로 SSR
// 비활성화하고 동적 임포트.
const ProductsGrid = dynamic(() => import('@/components/works/ProductsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function ProductsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ProductsGrid />
    </div>
  )
}
