import dynamic from 'next/dynamic'

const MoldPositionsGrid = dynamic(() => import('@/components/works/MoldPositionsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function MoldPositionsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MoldPositionsGrid />
    </div>
  )
}
