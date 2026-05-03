import dynamic from 'next/dynamic'

const PolishingFinishGrid = dynamic(() => import('@/components/works/PolishingFinishGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function PolishingFinishPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <PolishingFinishGrid />
    </div>
  )
}
