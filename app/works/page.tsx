import dynamic from 'next/dynamic'

const WorksGrid = dynamic(() => import('@/components/works/WorksGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function WorksPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <h1 className="text-[18px] font-bold text-[#111827] tracking-tight">Works</h1>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <WorksGrid />
      </div>
    </div>
  )
}
