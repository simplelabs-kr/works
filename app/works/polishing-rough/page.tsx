import dynamic from 'next/dynamic'

const PolishingRoughGrid = dynamic(() => import('@/components/works/PolishingRoughGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function PolishingRoughPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <PolishingRoughGrid />
    </div>
  )
}
