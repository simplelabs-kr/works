import dynamic from 'next/dynamic'

const SprueWeightsGrid = dynamic(() => import('@/components/works/SprueWeightsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function SprueWeightsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SprueWeightsGrid />
    </div>
  )
}
