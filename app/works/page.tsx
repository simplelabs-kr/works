import dynamic from 'next/dynamic'
import WorksHeader from '@/components/works/WorksHeader'

const WorksGrid = dynamic(() => import('@/components/works/WorksGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function WorksPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <WorksHeader />

      {/* Content — fills remaining height, no padding */}
      <div className="flex-1 overflow-hidden min-h-0">
        <WorksGrid />
      </div>
    </div>
  )
}
