import dynamic from 'next/dynamic'

const WorksGrid = dynamic(() => import('@/components/works/WorksGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function WorksPage() {
  return (
    <div className="px-6 py-4">
      <h1 className="mb-4 text-xl font-semibold">Works</h1>
      <WorksGrid />
    </div>
  )
}
