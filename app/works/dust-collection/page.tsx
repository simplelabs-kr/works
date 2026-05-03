import dynamic from 'next/dynamic'

const DustCollectionGrid = dynamic(() => import('@/components/works/DustCollectionGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function DustCollectionPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DustCollectionGrid />
    </div>
  )
}
