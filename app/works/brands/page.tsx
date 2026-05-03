import dynamic from 'next/dynamic'

const BrandsGrid = dynamic(() => import('@/components/works/BrandsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function BrandsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BrandsGrid />
    </div>
  )
}
