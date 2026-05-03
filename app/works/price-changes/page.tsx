import dynamic from 'next/dynamic'

const PriceChangesGrid = dynamic(() => import('@/components/works/PriceChangesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function PriceChangesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <PriceChangesGrid />
    </div>
  )
}
