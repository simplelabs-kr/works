import dynamic from 'next/dynamic'

const MetalsGrid = dynamic(() => import('@/components/works/MetalsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function MetalsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MetalsGrid />
    </div>
  )
}
