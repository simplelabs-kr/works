import dynamic from 'next/dynamic'

const MetalPricesGrid = dynamic(() => import('@/components/works/MetalPricesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function MetalPricesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MetalPricesGrid />
    </div>
  )
}
